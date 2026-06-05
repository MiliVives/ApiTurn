export interface CostBreakdown {
  baseCost: number;
  processingCost: number;
  drumCost: number;
  estimatedHoneyKg: number;
  estimatedDrumsNeeded: number;
  totalCost: number;
}

export function estimateCost(
  service: {
    baseFeeARS?: number | null;
    perKgFeeARS?: number | null;
    drumRentalFeeARS?: number | null;
  },
  appointment: {
    totalFilledKg?: number | null;
    totalEmptyKg?: number | null;
  },
  producerHasDrums = false
): CostBreakdown {
  const baseFee = service.baseFeeARS ?? 0;
  const perKgFee = service.perKgFeeARS ?? 0;
  const drumRentalFee = service.drumRentalFeeARS ?? 0;

  const filledKg = appointment.totalFilledKg ?? 0;
  const emptyKg = appointment.totalEmptyKg ?? 0;
  const netKg = Math.max(0, filledKg - emptyKg);

  const processingCost = netKg * perKgFee;
  const drumsNeeded = netKg > 0 ? Math.ceil(netKg / 335) : 0;
  const drumCost = producerHasDrums ? 0 : drumsNeeded * drumRentalFee;
  const totalCost = baseFee + processingCost + drumCost;

  return {
    baseCost: baseFee,
    processingCost,
    drumCost,
    estimatedHoneyKg: netKg,
    estimatedDrumsNeeded: drumsNeeded,
    totalCost,
  };
}

/**
 * Increments the lote number for the current season.
 * Format: NNNN/YY (e.g. "0001/26"). Year suffix resets each calendar year.
 */
export function generateNextLoteNumber(lastLoteNumber: string | null | undefined): string {
  const yearSuffix = (new Date().getFullYear() % 100).toString().padStart(2, '0');
  if (!lastLoteNumber) return `0001/${yearSuffix}`;
  const match = lastLoteNumber.match(/^(\d+)\//);
  if (!match) return `0001/${yearSuffix}`;
  const next = (parseInt(match[1], 10) + 1).toString().padStart(4, '0');
  return `${next}/${yearSuffix}`;
}
