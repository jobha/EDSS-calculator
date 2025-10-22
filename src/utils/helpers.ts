// ============================================================================
// UTILITY HELPER FUNCTIONS
// ============================================================================

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function roundToHalf(x: number) {
  return Math.round(x * 2) / 2;
}

export function ceilToHalf(x: number) {
  return Math.ceil(x * 2) / 2;
}
