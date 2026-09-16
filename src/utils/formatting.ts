// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

import type { EyeAcuity } from "../types/edss";

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
