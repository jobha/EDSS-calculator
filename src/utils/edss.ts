// ============================================================================
// EDSS CALCULATION
// ============================================================================

import type { AssistanceId } from "../types/edss";
import { ceilToHalf } from "./helpers";

export function convertVisualForEDSS(v: number): number {
  if (v >= 6) return 4; if (v === 5 || v === 4) return 3; if (v === 3 || v === 2) return 2; if (v === 1) return 1; return 0;
}

export function convertBBForEDSS(bb: number): number {
  // Corrected FS scores
  if (bb === 6) return 5; // Loss of bladder AND bowel → 5
  if (bb === 5) return 4; // Loss of bladder OR bowel → 4
  if (bb === 4) return 3; // Permanent catheter OR weekly bowel incontinence → 3
  if (bb === 3) return 2; // Frequent incontinence OR intermittent catheterization → 2
  if (bb === 2) return 2; // Moderate urge/constipation OR rare incontinence → 2
  if (bb === 1) return 1; // Mild urge or constipation → 1
  return 0;
}

export function correctedFS(fs: Record<string, number>): Record<string, number> {
  const out = { ...fs } as Record<string, number>;
  out.V = convertVisualForEDSS(fs.V);
  out.BB = convertBBForEDSS(fs.BB);
  return out;
}

export function computeLowEDSS_Neurostatus(fs: Record<string, number>) {
  const v = Object.values(fs);
  const cnt = (n: number) => v.filter((x) => x === n).length;
  const max = Math.max(...v);

  // Count occurrences at each FS level
  const cnt1 = cnt(1);
  const cnt2 = cnt(2);
  const cnt3 = cnt(3);
  const cnt4 = cnt(4);
  const cnt5 = cnt(5);
  const cnt6 = cnt(6);

  // Row 1: All FS = 0 → EDSS 0
  if (v.every((x) => x === 0)) {
    return { edss: 0.0, rationale: "All FS = 0" };
  }

  // Row 2: FS1=1 → EDSS 1
  if (cnt1 === 1 && max === 1) {
    return { edss: 1.0, rationale: "Single FS = 1" };
  }

  // Row 3: FS1>1 → EDSS 1.5
  if (cnt1 > 1 && max === 1) {
    return { edss: 1.5, rationale: ">1 FS = 1" };
  }

  // Row 4: FS2=1 → EDSS 2
  if (cnt2 === 1 && max === 2) {
    return { edss: 2.0, rationale: "Single FS = 2" };
  }

  // Row 5: FS2=2 → EDSS 2.5
  if (cnt2 === 2 && max === 2) {
    return { edss: 2.5, rationale: "Two FS = 2" };
  }

  // Row 6: FS2=0, FS3=1 → EDSS 3
  if (cnt2 === 0 && cnt3 === 1 && max === 3) {
    return { edss: 3.0, rationale: "Single FS = 3, no FS = 2" };
  }

  // Row 7: FS2=3-4 → EDSS 3
  if (cnt2 >= 3 && cnt2 <= 4 && max === 2) {
    return { edss: 3.0, rationale: "3-4 FS = 2" };
  }

  // Row 8: FS2=1-2, FS3=1 → EDSS 3.5 (must check before row 15)
  if (cnt2 >= 1 && cnt2 <= 2 && cnt3 === 1 && max === 3) {
    return { edss: 3.5, rationale: "1-2 FS = 2, single FS = 3" };
  }

  // Row 9: FS2=0, FS3=2 → EDSS 3.5
  if (cnt2 === 0 && cnt3 === 2 && max === 3) {
    return { edss: 3.5, rationale: "Two FS = 3, no FS = 2" };
  }

  // Row 10: FS2=5 → EDSS 3.5
  if (cnt2 === 5 && max === 2) {
    return { edss: 3.5, rationale: "Five FS = 2" };
  }

  // Row 11: FS2=0, FS3=0, FS4=1 → EDSS 4
  if (cnt2 === 0 && cnt3 === 0 && cnt4 === 1 && max === 4) {
    return { edss: 4.0, rationale: "Single FS = 4, no FS = 2 or 3" };
  }

  // Row 12: FS2=0, FS3=3-4 → EDSS 4
  if (cnt2 === 0 && cnt3 >= 3 && cnt3 <= 4 && max === 3) {
    return { edss: 4.0, rationale: "0 FS = 2, 3-4 FS = 3" };
  }

  // Row 13: FS2>=3, FS3=1 → EDSS 4
  if (cnt2 >= 3 && cnt3 === 1 && max === 3) {
    return { edss: 4.0, rationale: ">=3 FS = 2, single FS = 3" };
  }

  // Row 14: FS2>0, FS3=2-4 → EDSS 4
  if (cnt2 > 0 && cnt3 >= 2 && cnt3 <= 4 && max === 3) {
    return { edss: 4.0, rationale: ">0 FS = 2, 2-4 FS = 3" };
  }

  // Row 15: FS2>5 → EDSS 4
  if (cnt2 > 5 && max === 2) {
    return { edss: 4.0, rationale: ">5 FS = 2" };
  }

  // Row 16: FS3=5 → EDSS 4.5
  if (cnt3 === 5 && max === 3) {
    return { edss: 4.5, rationale: "Five FS = 3" };
  }

  // Row 17: FS3=1-2, FS4=1 → EDSS 4.5
  if (cnt3 >= 1 && cnt3 <= 2 && cnt4 === 1 && max === 4) {
    return { edss: 4.5, rationale: "1-2 FS = 3, single FS = 4" };
  }

  // Row 18: FS2>=1, FS4=1 → EDSS 4.5
  if (cnt2 >= 1 && cnt4 === 1 && max === 4) {
    return { edss: 4.5, rationale: "FS = 2 present, single FS = 4" };
  }

  // Row 19: FS5>=1 → EDSS 5
  if (cnt5 >= 1) {
    return { edss: 5.0, rationale: "FS = 5 present" };
  }

  // Row 20: FS4>=2 → EDSS 5
  if (cnt4 >= 2) {
    return { edss: 5.0, rationale: ">=2 FS = 4" };
  }

  // Row 21: FS3>=6 → EDSS 5
  if (cnt3 >= 6) {
    return { edss: 5.0, rationale: ">=6 FS = 3" };
  }

  // If max FS is 6, always EDSS 5.0
  if (cnt6 >= 1) {
    return { edss: 5.0, rationale: "FS = 6 present" };
  }

  // Fallback for any unmatched patterns
  if (max >= 4) {
    return { edss: 5.0, rationale: "FS >= 4 present" };
  }

  if (max === 3) {
    return { edss: 4.5, rationale: "FS = 3 pattern" };
  }

  return { edss: 4.0, rationale: "Default pattern" };
}

export function computeAmbulationEDSS(assistance: AssistanceId, distanceNoAid: number | null) {
  // Handle walking with aids
  switch (assistance) {
    case "uni_50_plus":
      // 6.0: ≥50m with unilateral aid OR <100m without aid
      return { edss: 6.0, rationale: "Walks ≥50 m with unilateral aid" } as const;
    case "uni_under_50":
      // 6.5: <50m with unilateral aid
      return { edss: 6.5, rationale: "Walks <50 m with unilateral aid" } as const;
    case "bi_120_plus":
      // 6.0: ≥120m with bilateral aid
      return { edss: 6.0, rationale: "Walks ≥120 m with bilateral aid" } as const;
    case "bi_5_to_120":
      // 6.5: ≥5m but <120m with bilateral aid
      return { edss: 6.5, rationale: "Walks ≥5 m but <120 m with bilateral aid" } as const;
    case "bi_under_5":
      // 7.0: <5m with bilateral aid
      return { edss: 7.0, rationale: "Walks <5 m with bilateral aid" } as const;
    case "wheel_self":
      // 7.0: Self-propels wheelchair, transfers independently
      return { edss: 7.0, rationale: "Wheelchair; self-propels and transfers independently" } as const;
    case "wheel_some_help":
      // 7.5: Needs some help with transfers
      return { edss: 7.5, rationale: "Wheelchair; needs help with transfers, self-propels" } as const;
    case "wheel_dependent":
      // 8.0: Completely dependent for wheelchair
      return { edss: 8.0, rationale: "Wheelchair; completely dependent" } as const;
    case "bed_chair_arms_ok":
      return { edss: 8.0, rationale: "Bed/chair; arms effective" } as const;
    case "bed_chair_limited_arms":
      return { edss: 8.5, rationale: "Bed-bound; limited arm use" } as const;
    case "helpless":
      return { edss: 9.0, rationale: "Helpless bedridden" } as const;
    case "total_care":
      return { edss: 9.5, rationale: "Totally helpless; total care" } as const;
  }

  // Handle walking without aids
  if (assistance === "none" && distanceNoAid != null) {
    // No upper limit mentioned - unlimited walking = can be 0-4.5 based on FS
    if (distanceNoAid >= 500) return null; // Will be determined by FS score
    if (distanceNoAid >= 300) return { edss: 4.5, rationale: "Walks 300-499 m unaided" } as const;
    if (distanceNoAid >= 200) return { edss: 5.0, rationale: "Walks 200-299 m unaided" } as const;
    if (distanceNoAid >= 100) return { edss: 5.5, rationale: "Walks 100-199 m unaided" } as const;
    // <100m without aid = 6.0
    return { edss: 6.0, rationale: "Walks <100 m unaided" } as const;
  }
  return null;
}

export function computeEDSSFromInputs(fs: Record<string, number>, assistance: AssistanceId, distanceNoAid: number | null) {
  // Use corrected FS scores for EDSS calculation
  const correctedFSValues = correctedFS(fs);
  const low = computeLowEDSS_Neurostatus(correctedFSValues);

  if (assistance !== "none") {
    const ambAid = computeAmbulationEDSS(assistance, distanceNoAid);
    const base = ambAid ?? (low ?? { edss: 4.0, rationale: "Default 4.0" } as const);
    const maxFS = Math.max(...Object.values(correctedFSValues));
    const finalEDSS = Math.max(base.edss, ceilToHalf(maxFS));
    const rationale = finalEDSS > base.edss ? base.rationale + ` (raised to ${finalEDSS} due to max FS=${maxFS})` : base.rationale;
    return { edss: finalEDSS, rationale } as const;
  }
  if (distanceNoAid == null) {
    const base = low ?? ({ edss: 4.0, rationale: "Default 4.0" } as const);
    const maxFS = Math.max(...Object.values(correctedFSValues));
    const finalEDSS = Math.max(base.edss, ceilToHalf(maxFS));
    const rationale = finalEDSS > base.edss ? base.rationale + ` (raised to ${finalEDSS} due to max FS=${maxFS})` : base.rationale;
    return { edss: finalEDSS, rationale } as const;
  }
  let base: { edss: number; rationale: string } | null = null;
  if (distanceNoAid >= 500) base = low ?? { edss: 4.0, rationale: "Walks >=500 m unaided" } as const;
  else base = computeAmbulationEDSS(assistance, distanceNoAid) ?? (low ?? { edss: 4.5, rationale: "Distance <500 m" } as const);
  const maxFS = Math.max(...Object.values(correctedFSValues));
  const finalEDSS = Math.max(base.edss, ceilToHalf(maxFS));
  const rationale = finalEDSS > base.edss ? base.rationale + ` (raised to ${finalEDSS} due to max FS=${maxFS})` : base.rationale;
  return { edss: finalEDSS, rationale } as const;
}
