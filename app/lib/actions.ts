'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { UrgencyLevel, AppointmentStatus } from '@/generated/prisma/client';
import { sendConfirmedEmail, sendRescheduledEmail, sendCancelledEmail } from '@/app/lib/email';
import { generateNextLoteNumber, estimateCost } from '@/app/lib/pricing';
import { estimateDuration, appointmentsOverlap } from '@/app/lib/scheduling';

// ─── Client Actions ───────────────────────────────────────────────────────────

export async function createAppointmentRequest(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const serviceId = formData.get('serviceId') as string;
  const honeyVariety = formData.get('honeyVariety') as string;
  const frame1Half    = parseInt(formData.get('frame1Half')    as string, 10);
  const frame3Quarter = parseInt(formData.get('frame3Quarter') as string, 10);
  const frameStd      = parseInt(formData.get('frameStd')      as string, 10);
  const urgencyLevel = (formData.get('urgencyLevel') as UrgencyLevel) ?? 'STANDARD';
  const apiarySource = formData.get('apiarySource') as string;
  const notes = formData.get('notes') as string;
  const totalEmptyKg  = formData.get('totalEmptyKg')  ? parseFloat(formData.get('totalEmptyKg')  as string) : null;
  const totalFilledKg = formData.get('totalFilledKg') ? parseFloat(formData.get('totalFilledKg') as string) : null;
  const scheduledAtRaw = formData.get('scheduledAt') as string;

  const f1 = isNaN(frame1Half)    ? 0 : frame1Half;
  const f3 = isNaN(frame3Quarter) ? 0 : frame3Quarter;
  const fs = isNaN(frameStd)      ? 0 : frameStd;
  const totalFrames = f1 + f3 + fs;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect('/client');
  if (!user.renapaNumber) redirect('/client/settings');

  let resolvedServiceId = serviceId;
  if (!resolvedServiceId) {
    const defaultService = await prisma.service.findFirst({ where: { isActive: true } });
    if (!defaultService) throw new Error('No active service found');
    resolvedServiceId = defaultService.id;
  }

  await prisma.appointment.create({
    data: {
      userId,
      serviceId: resolvedServiceId,
      scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : new Date(),
      honeyVariety: honeyVariety || null,
      quantity: totalFrames || null,
      frameCount1Half:    f1 || null,
      frameCount3Quarter: f3 || null,
      frameCountStd:      fs || null,
      totalEmptyKg:  totalEmptyKg  !== null && !isNaN(totalEmptyKg)  ? totalEmptyKg  : null,
      totalFilledKg: totalFilledKg !== null && !isNaN(totalFilledKg) ? totalFilledKg : null,
      urgencyLevel,
      apiarySource: apiarySource || null,
      notes: notes || null,
    },
  });

  revalidatePath('/client');
  redirect('/client');
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function confirmAppointment(formData: FormData) {
  const id = formData.get('id') as string;

  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { service: true },
  });

  // Overlap guard: abort if a CONFIRMED appointment already occupies this slot.
  const dur = estimateDuration(existing.quantity ?? 1);
  const dayStart = new Date(existing.scheduledAt); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd   = new Date(existing.scheduledAt); dayEnd.setUTCHours(23, 59, 59, 999);
  const sameDay = await prisma.appointment.findMany({
    where: { status: 'CONFIRMED', scheduledAt: { gte: dayStart, lte: dayEnd }, id: { not: id } },
    select: { scheduledAt: true, quantity: true },
  });
  const blocked = sameDay.some(c =>
    appointmentsOverlap(existing.scheduledAt, dur, c.scheduledAt, estimateDuration(c.quantity ?? 1))
  );
  if (blocked) { revalidatePath('/admin/pending'); return; }

  const lastLote = await prisma.appointment.findFirst({
    where: { loteNumber: { not: null } },
    orderBy: { loteDate: 'desc' },
    select: { loteNumber: true },
  });
  const nextLote = generateNextLoteNumber(lastLote?.loteNumber);
  const costEst = estimateCost(existing.service, existing, false);

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'CONFIRMED',
      loteNumber: nextLote,
      loteDate: new Date(),
      estimatedCostARS: costEst.totalCost,
    },
    include: { user: true },
  });

  const dateLabel = appointment.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' });

  await prisma.notification.create({
    data: {
      userId: appointment.userId,
      appointmentId: id,
      type: 'CONFIRMED',
      message: `Tu solicitud de extracción ha sido confirmada para el ${dateLabel}. Lote: ${nextLote}`,
    },
  });

  try {
    await sendConfirmedEmail(appointment.user.email, appointment.user.name, dateLabel, nextLote);
  } catch { /* email failure must not break the action */ }

  revalidatePath('/admin/pending');
  revalidatePath('/admin/scheduler');
}

export async function rescheduleAppointment(formData: FormData) {
  const id = formData.get('id') as string;
  const newDateRaw = formData.get('newDate') as string;
  const newDate = new Date(newDateRaw);

  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { service: true },
  });

  // Overlap guard: abort if a CONFIRMED appointment already occupies the new slot.
  const rDur = estimateDuration(existing.quantity ?? 1);
  const rDayStart = new Date(newDate); rDayStart.setUTCHours(0, 0, 0, 0);
  const rDayEnd   = new Date(newDate); rDayEnd.setUTCHours(23, 59, 59, 999);
  const rSameDay = await prisma.appointment.findMany({
    where: { status: 'CONFIRMED', scheduledAt: { gte: rDayStart, lte: rDayEnd }, id: { not: id } },
    select: { scheduledAt: true, quantity: true },
  });
  const rBlocked = rSameDay.some(c =>
    appointmentsOverlap(newDate, rDur, c.scheduledAt, estimateDuration(c.quantity ?? 1))
  );
  if (rBlocked) { revalidatePath('/admin/pending'); return; }

  // Assign lote # on first confirmation (reschedule also confirms)
  let loteFields: { loteNumber?: string; loteDate?: Date; estimatedCostARS?: number } = {};
  if (!existing.loteNumber) {
    const lastLote = await prisma.appointment.findFirst({
      where: { loteNumber: { not: null } },
      orderBy: { loteDate: 'desc' },
      select: { loteNumber: true },
    });
    const nextLote = generateNextLoteNumber(lastLote?.loteNumber);
    const costEst = estimateCost(existing.service, existing, false);
    loteFields = { loteNumber: nextLote, loteDate: new Date(), estimatedCostARS: costEst.totalCost };
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED', scheduledAt: newDate, ...loteFields },
    include: { user: true },
  });

  const dateLabel = newDate.toLocaleDateString('es-AR', { dateStyle: 'long' });

  await prisma.notification.create({
    data: {
      userId: appointment.userId,
      appointmentId: id,
      type: 'RESCHEDULED',
      message: `Tu extracción fue reprogramada al ${dateLabel}.`,
    },
  });

  try {
    await sendRescheduledEmail(appointment.user.email, appointment.user.name, dateLabel);
  } catch { /* email failure must not break the action */ }

  revalidatePath('/admin/pending');
  revalidatePath('/admin/scheduler');
}

export async function cancelAppointment(formData: FormData) {
  const id = formData.get('id') as string;
  const reason = (formData.get('reason') as string) || '';

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', adminNotes: reason || null },
    include: { user: true },
  });

  await prisma.notification.create({
    data: {
      userId: appointment.userId,
      appointmentId: id,
      type: 'CANCELLED',
      message: reason
        ? `Tu solicitud de extracción fue cancelada. Motivo: ${reason}`
        : 'Tu solicitud de extracción fue cancelada por el administrador.',
    },
  });

  try {
    await sendCancelledEmail(appointment.user.email, appointment.user.name, reason || undefined);
  } catch { /* email failure must not break the action */ }

  revalidatePath('/admin/pending');
  revalidatePath('/admin/scheduler');
}

const RENAPA_REGEX = /^\d{4}-\d{2}-\d{5}$/;

export async function updateRenapaNumber(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const renapaNumber = (formData.get('renapaNumber') as string ?? '').trim();
  if (renapaNumber && !RENAPA_REGEX.test(renapaNumber)) return;

  await prisma.user.update({
    where: { id: userId },
    data: { renapaNumber: renapaNumber || null },
  });

  revalidatePath('/client/settings');
  revalidatePath('/client');
}

export async function updateProducerPriority(formData: FormData) {
  const userId = formData.get('userId') as string;
  const priority = formData.get('priority') as string;
  const validPriorities = ['STANDARD', 'PRIORITY', 'IMMEDIATE'];
  if (!validPriorities.includes(priority)) return;

  await prisma.user.update({
    where: { id: userId },
    data: { producerPriority: priority as 'STANDARD' | 'PRIORITY' | 'IMMEDIATE' },
  });

  revalidatePath('/admin/producers');
}

export async function updateAppointmentFields(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'WORKER')) return;

  const id = formData.get('id') as string;
  const f1 = parseInt(formData.get('frameCount1Half')    as string, 10);
  const f3 = parseInt(formData.get('frameCount3Quarter') as string, 10);
  const fs = parseInt(formData.get('frameCountStd')      as string, 10);
  const filledRaw = formData.get('totalFilledKg') as string;
  const emptyRaw  = formData.get('totalEmptyKg')  as string;

  const frame1 = isNaN(f1) ? 0 : Math.max(0, f1);
  const frame3 = isNaN(f3) ? 0 : Math.max(0, f3);
  const frameS = isNaN(fs) ? 0 : Math.max(0, fs);
  const total  = frame1 + frame3 + frameS;
  const filled = filledRaw !== '' && filledRaw !== null ? parseFloat(filledRaw) : null;
  const empty  = emptyRaw  !== '' && emptyRaw  !== null ? parseFloat(emptyRaw)  : null;

  await prisma.appointment.update({
    where: { id },
    data: {
      frameCount1Half:    frame1 || null,
      frameCount3Quarter: frame3 || null,
      frameCountStd:      frameS || null,
      quantity:           total  || null,
      totalFilledKg:      filled !== null && !isNaN(filled) ? filled : undefined,
      totalEmptyKg:       empty  !== null && !isNaN(empty)  ? empty  : undefined,
    },
  });

  revalidatePath('/admin/pending');
  revalidatePath('/admin/appointments');
  revalidatePath('/worker/active');
}

export async function applyOptimizedSchedule(
  proposed: { id: string; suggestedDate: string }[]
) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  if (!proposed.length) return;

  // Validate all dates before touching the DB
  const updates = proposed.map(({ id, suggestedDate }) => {
    const d = new Date(suggestedDate);
    if (isNaN(d.getTime())) throw new Error(`Fecha inválida para turno ${id}: ${suggestedDate}`);
    return { id, date: d };
  });

  // Snapshot current scheduledAt so we can detect which appointments actually moved
  const before = await prisma.appointment.findMany({
    where: { id: { in: updates.map(u => u.id) } },
    select: { id: true, userId: true, scheduledAt: true },
  });

  // Single transaction — all succeed or none
  await prisma.$transaction(
    updates.map(({ id, date }) =>
      prisma.appointment.update({
        where: { id },
        data: { scheduledAt: date },
      })
    )
  );

  // Create RESCHEDULED notifications for appointments that actually changed time
  for (const { id, date } of updates) {
    const orig = before.find(b => b.id === id);
    if (!orig || orig.scheduledAt.getTime() === date.getTime()) continue;
    const label = date.toLocaleDateString('es-AR', { dateStyle: 'long' });
    await prisma.notification.create({
      data: {
        userId: orig.userId,
        appointmentId: id,
        type: 'RESCHEDULED',
        message: `Tu extracción fue reprogramada al ${label} por optimización del calendario.`,
      },
    });
  }

  revalidatePath('/admin/scheduler');
}

// ─── Notification Actions ─────────────────────────────────────────────────────

export async function dismissNotification(formData: FormData) {
  const id = formData.get('id') as string;
  const { userId } = await auth();
  if (!userId) return;

  await prisma.notification.deleteMany({ where: { id, userId } });
  revalidatePath('/client/notifications');
}

export async function declineRescheduledAppointment(formData: FormData) {
  const notificationId = formData.get('notificationId') as string;
  const { userId } = await auth();
  if (!userId) return;

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification?.appointmentId) return;

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: notification.appointmentId },
      data: { status: 'CANCELLED', adminNotes: 'Reprogramación rechazada por el productor.' },
    }),
    prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    }),
  ]);

  revalidatePath('/client/notifications');
}

// ─── Worker Actions ───────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  CONFIRMED:   'CHECKED_IN',
  CHECKED_IN:  'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

export async function updateAppointmentStatus(formData: FormData) {
  const appointmentId = formData.get('appointmentId') as string;
  const { userId } = await auth();
  if (!userId) return;

  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!caller || (caller.role !== 'WORKER' && caller.role !== 'ADMIN')) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true },
  });
  if (!appt) return;

  const next = STATUS_TRANSITIONS[appt.status];
  if (!next) return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: next },
  });

  revalidatePath('/worker/active');
  revalidatePath(`/worker/appointments/${appointmentId}`);
}

// ─── Service Config ───────────────────────────────────────────────────────────

export async function updateServiceConfig(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!caller || caller.role !== 'ADMIN') return;

  const id = formData.get('serviceId') as string;
  const parseF = (key: string) => {
    const v = (formData.get(key) as string ?? '').trim();
    if (v === '') return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  await prisma.service.update({
    where: { id },
    data: {
      baseFeeARS:           parseF('baseFeeARS'),
      perKgFeeARS:          parseF('perKgFeeARS'),
      drumRentalFeeARS:     parseF('drumRentalFeeARS'),
      avgKgPer1HalfAlza:    parseF('avgKgPer1HalfAlza'),
      avgKgPer3QuarterAlza: parseF('avgKgPer3QuarterAlza'),
      avgKgPerStdAlza:      parseF('avgKgPerStdAlza'),
    },
  });

  revalidatePath('/admin/service');
}

export async function markNotificationRead(formData: FormData) {
  const id = formData.get('id') as string;
  const { userId } = await auth();
  if (!userId) return;

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });

  revalidatePath('/client/notifications');
}
