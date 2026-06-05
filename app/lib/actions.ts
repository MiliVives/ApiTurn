'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { UrgencyLevel } from '@/generated/prisma/client';
import { sendConfirmedEmail, sendRescheduledEmail, sendCancelledEmail } from '@/app/lib/email';
import { generateNextLoteNumber, estimateCost } from '@/app/lib/pricing';

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
  const id = formData.get('id') as string;
  const f1 = parseInt(formData.get('frameCount1Half')    as string, 10);
  const f3 = parseInt(formData.get('frameCount3Quarter') as string, 10);
  const fs = parseInt(formData.get('frameCountStd')      as string, 10);

  const frame1 = isNaN(f1) ? 0 : Math.max(0, f1);
  const frame3 = isNaN(f3) ? 0 : Math.max(0, f3);
  const frameS = isNaN(fs) ? 0 : Math.max(0, fs);
  const total  = frame1 + frame3 + frameS;

  await prisma.appointment.update({
    where: { id },
    data: {
      frameCount1Half:    frame1 || null,
      frameCount3Quarter: frame3 || null,
      frameCountStd:      frameS || null,
      quantity:           total  || null,
    },
  });

  revalidatePath('/admin/pending');
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
