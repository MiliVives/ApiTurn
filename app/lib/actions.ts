'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { UrgencyLevel } from '@/generated/prisma/client';
import { sendConfirmedEmail, sendRescheduledEmail, sendCancelledEmail } from '@/app/lib/email';

// ─── Client Actions ───────────────────────────────────────────────────────────

export async function createAppointmentRequest(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const serviceId = formData.get('serviceId') as string;
  const honeyVariety = formData.get('honeyVariety') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10);
  const urgencyLevel = (formData.get('urgencyLevel') as UrgencyLevel) ?? 'STANDARD';
  const apiarySource = formData.get('apiarySource') as string;
  const notes = formData.get('notes') as string;
  const totalEmptyKg  = formData.get('totalEmptyKg')  ? parseFloat(formData.get('totalEmptyKg')  as string) : null;
  const totalFilledKg = formData.get('totalFilledKg') ? parseFloat(formData.get('totalFilledKg') as string) : null;
  const scheduledAtRaw = formData.get('scheduledAt') as string;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect('/client');

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
      quantity: isNaN(quantity) ? null : quantity,
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

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: { user: true },
  });

  const dateLabel = appointment.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' });

  await prisma.notification.create({
    data: {
      userId: appointment.userId,
      appointmentId: id,
      type: 'CONFIRMED',
      message: `Tu solicitud de extracción ha sido confirmada para el ${dateLabel}.`,
    },
  });

  try {
    await sendConfirmedEmail(appointment.user.email, appointment.user.name, dateLabel);
  } catch { /* email failure must not break the action */ }

  revalidatePath('/admin/pending');
  revalidatePath('/admin/scheduler');
}

export async function rescheduleAppointment(formData: FormData) {
  const id = formData.get('id') as string;
  const newDateRaw = formData.get('newDate') as string;
  const newDate = new Date(newDateRaw);

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED', scheduledAt: newDate },
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
