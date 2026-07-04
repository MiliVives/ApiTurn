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

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
