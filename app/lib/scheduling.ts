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

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
