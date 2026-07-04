export const MINUTES_PER_ALZA = 5;
export const BASE_DURATION_MIN = 60;
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 18;

export function estimateDuration(quantity: number): number {
  return BASE_DURATION_MIN + Math.max(0, quantity) * MINUTES_PER_ALZA;
}

export function estimateDurationFromFrames(f1: number, f3: number, fStd: number): number {
  return estimateDuration((f1 ?? 0) + (f3 ?? 0) + (fStd ?? 0));
}

export function appointmentsOverlap(at1: Date, dur1Min: number, at2: Date, dur2Min: number): boolean {
  const end1 = at1.getTime() + dur1Min * 60_000;
  const end2 = at2.getTime() + dur2Min * 60_000;
  return at1.getTime() < end2 && end1 > at2.getTime();
}

// Argentina is fixed UTC-3 (no DST).
// Argentine 09:00 = UTC 12:00, Argentine 18:00 = UTC 21:00.
const ARG_OFFSET_H = 3;

export function findNextAvailableSlot(
  after: Date,
  durationMin: number,
  occupied: Array<{ scheduledAt: Date; quantity: number | null }>,
  maxDaysAhead = 14,
): Date {
  const workStartUtcMin = (WORK_START_HOUR + ARG_OFFSET_H) * 60;
  const workEndUtcMin   = (WORK_END_HOUR   + ARG_OFFSET_H) * 60;

  const occupiedMs = occupied.map(o => ({
    start: o.scheduledAt.getTime(),
    end:   o.scheduledAt.getTime() + estimateDuration(o.quantity ?? 1) * 60_000,
  }));

  for (let d = 0; d <= maxDaysAhead; d++) {
    const utcDayBase = Date.UTC(
      after.getUTCFullYear(),
      after.getUTCMonth(),
      after.getUTCDate() + d,
    );

    const weekday = new Date(utcDayBase).toLocaleDateString('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
    });
    if (weekday === 'Saturday' || weekday === 'Sunday') continue;

    for (let mins = workStartUtcMin; mins + durationMin <= workEndUtcMin; mins += 60) {
      const candidateMs = utcDayBase + mins * 60_000;
      if (candidateMs <= after.getTime()) continue;

      const endMs = candidateMs + durationMin * 60_000;
      const conflict = occupiedMs.some(o => candidateMs < o.end && endMs > o.start);
      if (!conflict) return new Date(candidateMs);
    }
  }

  return new Date(after.getTime() + 3_600_000); // fallback: +1h
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
