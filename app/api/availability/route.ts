import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { estimateDuration, WORK_START_HOUR, WORK_END_HOUR } from '@/app/lib/scheduling';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateParam = searchParams.get('date');
  const quantityParam = searchParams.get('quantity');

  if (!dateParam) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const quantity = parseInt(quantityParam ?? '1', 10);
  const durationMin = estimateDuration(isNaN(quantity) ? 1 : quantity);

  const dayStart = new Date(dateParam + 'T00:00:00.000Z');
  const dayEnd   = new Date(dateParam + 'T23:59:59.999Z');

  // Only confirmed (or active) appointments block new bookings.
  // PENDING appointments do NOT block — multiple clients may compete for a slot;
  // the admin resolves conflicts on the pending list.
  const existing = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    },
    select: { scheduledAt: true, quantity: true },
  });

  // Convert each appointment to occupied minute-ranges in Argentine local time
  // so they align with the Argentine work-hour slot loop below.
  const occupied = existing.map(a => {
    const localStr = a.scheduledAt.toLocaleString('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [lh, lm] = localStr.split(':').map(Number);
    const start = lh * 60 + lm;
    const end = start + estimateDuration(a.quantity ?? 1);
    return { start, end };
  });

  const workStart = WORK_START_HOUR * 60;
  const workEnd   = WORK_END_HOUR   * 60;

  const slots: string[] = [];
  for (let start = workStart; start + durationMin <= workEnd; start += 60) {
    const end = start + durationMin;
    const conflict = occupied.some(o => start < o.end && end > o.start);
    if (!conflict) {
      const hh = String(Math.floor(start / 60)).padStart(2, '0');
      const mm = String(start % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }

  return NextResponse.json({ slots, durationMin });
}
