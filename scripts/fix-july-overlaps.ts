/**
 * Resolves overlapping appointments in the week of July 6–12, 2026.
 * CONFIRMED appointments keep their slots; PENDING appointments that conflict
 * are rescheduled to the next available slot (FIFO by createdAt).
 *
 * Run with:
 *   npx tsx --env-file=.env scripts/fix-july-overlaps.ts
 */

import { config } from 'dotenv';
config({ path: '.env' });

// @ts-ignore
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { estimateDuration, appointmentsOverlap, findNextAvailableSlot } from '../app/lib/scheduling';

function createClient() {
  const url = new URL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!);
  url.searchParams.set('sslmode', 'verify-full');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
}

const prisma = createClient();

async function main() {
  // Capture all active appointments for the week (UTC day boundaries cover Arg working hours)
  const weekStart = new Date('2026-07-06T00:00:00.000Z');
  const weekEnd   = new Date('2026-07-12T23:59:59.999Z');

  const all = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: weekStart, lte: weekEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (all.length === 0) {
    console.log('No active appointments found in that week.');
    return;
  }

  // CONFIRMED keeps its slot; IN_PROGRESS and PENDING are rescheduled if they conflict.
  // Sort: CONFIRMED first, then by createdAt.
  all.sort((a: { status: string; createdAt: Date }, b: { status: string; createdAt: Date }) => {
    if (a.status === 'CONFIRMED' && b.status !== 'CONFIRMED') return -1;
    if (b.status === 'CONFIRMED' && a.status !== 'CONFIRMED') return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const resolved: Array<{ scheduledAt: Date; quantity: number | null }> = [];
  let fixedCount = 0;

  for (const appt of all) {
    const dur = estimateDuration(appt.quantity ?? 1);
    const conflict = resolved.some(r =>
      appointmentsOverlap(appt.scheduledAt, dur, r.scheduledAt, estimateDuration(r.quantity ?? 1))
    );

    const label = `[${appt.status.padEnd(9)}] ${appt.user.name}`;

    if (!conflict) {
      console.log(`  OK     ${label} @ ${fmt(appt.scheduledAt)}`);
      resolved.push({ scheduledAt: appt.scheduledAt, quantity: appt.quantity });
      continue;
    }

    if (appt.status === 'CONFIRMED') {
      console.warn(`  SKIP   ${label} — confirmed conflict, manual review needed`);
      resolved.push({ scheduledAt: appt.scheduledAt, quantity: appt.quantity });
      continue;
    }

    const newSlot = findNextAvailableSlot(appt.scheduledAt, dur, resolved);
    await prisma.appointment.update({ where: { id: appt.id }, data: { scheduledAt: newSlot } });

    console.log(`  FIXED  ${label}  ${fmt(appt.scheduledAt)} → ${fmt(newSlot)}`);
    resolved.push({ scheduledAt: newSlot, quantity: appt.quantity });
    fixedCount++;
  }

  console.log(`\nDone. Fixed ${fixedCount} / ${all.length} appointments.`);
}

function fmt(d: Date) {
  return d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
