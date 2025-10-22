// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

import type { EyeAcuity } from "../types/edss";

export function acuityToNumeric(acuity: EyeAcuity): number {
  const map: Record<EyeAcuity, number> = {
    "1.0": 1.0,
    "0.68-0.99": 0.835,
    "0.34-0.67": 0.505,
    "0.21-0.33": 0.27,
    "0.10-0.20": 0.15,
    "lt_0.10": 0.05,
  };
  return map[acuity];
}

export function formatEyeAcuity(acuity: EyeAcuity): string {
  const map: Record<EyeAcuity, string> = {
    "1.0": "1.0",
    "0.68-0.99": "0.68-0.99",
    "0.34-0.67": "0.34-0.67",
    "0.21-0.33": "0.21-0.33",
    "0.10-0.20": "0.10-0.20",
    "lt_0.10": "<0.10",
  };
  return map[acuity];
}
