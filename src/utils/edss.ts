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

function computeLowEDSS_Neurostatus(fs: Record<string, number>) {
  const v = Object.values(fs);
  const cnt = (n: number) => v.filter((x) => x === n).length;
  const max = Math.max(...v);
  const noneAbove = (n: number) => v.every((x) => x <= n);
  const rules = [
    { when: () => v.every((x) => x === 0), out: { edss: 0.0, rationale: "All FS = 0" } },
    { when: () => cnt(1) === 1 && noneAbove(1), out: { edss: 1.0, rationale: "Single FS = 1; others 0" } },
    { when: () => cnt(1) >= 2 && noneAbove(1), out: { edss: 1.5, rationale: ">=2 FS = 1; others 0" } },
    { when: () => cnt(2) === 1 && noneAbove(2), out: { edss: 2.0, rationale: "Single FS = 2; others <=1" } },
    { when: () => cnt(2) === 2 && noneAbove(2), out: { edss: 2.5, rationale: "Two FS = 2; others <=1" } },
    { when: () => cnt(2) >= 3 && noneAbove(2), out: { edss: 3.0, rationale: "Three or four FS = 2; others <=1" } },
    { when: () => cnt(3) === 1 && cnt(2) >= 1 && noneAbove(3), out: { edss: 3.5, rationale: "One FS = 3 plus others = 2" } },
    { when: () => cnt(3) === 1 && v.filter((x) => x !== 3).every((x) => x <= 2), out: { edss: 3.0, rationale: "Single FS = 3; others <=2" } },
    { when: () => cnt(3) >= 2 && noneAbove(3), out: { edss: 3.5, rationale: "Two FS = 3" } },
  ] as const;
  for (const r of rules) if (r.when()) return r.out as { edss: number; rationale: string };
  if (max <= 3) return { edss: 3.5, rationale: "FS pattern consistent with <=3.5" } as const;
  return null;
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
    return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
  }
  if (distanceNoAid == null) {
    const base = low ?? ({ edss: 4.0, rationale: "Default 4.0" } as const);
    const maxFS = Math.max(...Object.values(correctedFSValues));
    return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
  }
  let base: { edss: number; rationale: string } | null = null;
  if (distanceNoAid >= 500) base = low ?? { edss: 4.0, rationale: "Walks >=500 m unaided" } as const;
  else base = computeAmbulationEDSS(assistance, distanceNoAid) ?? (low ?? { edss: 4.5, rationale: "Distance <500 m" } as const);
  const maxFS = Math.max(...Object.values(correctedFSValues));
  return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
}
