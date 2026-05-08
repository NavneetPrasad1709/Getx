/**
 * Convert USD → INR with platform margin deducted from gross.
 * Margin is the spread the platform keeps; defaults to 2%.
 */
export function convertUsdToInr(usd: number, rate: number, marginPercent = 2): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error('convertUsdToInr: usd must be a non-negative finite number');
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('convertUsdToInr: rate must be a positive finite number');
  }
  if (marginPercent < 0 || marginPercent >= 100) {
    throw new Error('convertUsdToInr: marginPercent must be in [0, 100)');
  }
  const grossInr = usd * rate;
  return grossInr * (1 - marginPercent / 100);
}
