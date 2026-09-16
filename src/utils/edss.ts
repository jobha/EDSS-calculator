// ============================================================================
// EDSS CALCULATION
// Neurostatus scoring table (version 04/10.3) and definitions (version 04/10.2)
// ============================================================================

import type { AssistanceId } from "../types/edss";

export function convertVisualForEDSS(v: number): number {
  if (v >= 6) return 4; if (v === 5 || v === 4) return 3; if (v === 3 || v === 2) return 2; if (v === 1) return 1; return 0;
}

export function convertBBForEDSS(bb: number): number {
  if (bb >= 6) return 5;
  if (bb === 5) return 4;
  if (bb === 4 || bb === 3) return 3;
  if (bb === 2) return 2;
  if (bb === 1) return 1;
  return 0;
}

export function correctedFS(fs: Record<string, number>): Record<string, number> {
  const out = { ...fs } as Record<string, number>;
  out.V = convertVisualForEDSS(fs.V);
  out.BB = convertBBForEDSS(fs.BB);
  return out;
}

// ----------------------------------------------------------------------------
// EDSS step from (converted) FS scores
// ----------------------------------------------------------------------------

export type FSColumn = "0" | "1" | "2" | "3" | "4" | "5";

export type FSStepRow = {
  edss: number;
  // Required number of FS at each grade; columns not listed have no impact
  cells: Partial<Record<FSColumn, string>>;
  // false: combination not listed in the scoring table, derived from the EDSS step definitions
  // ("combination of lesser grades exceeding limits of previous steps")
  inTable: boolean;
};

export const FS_STEP_ROWS: FSStepRow[] = [
  { edss: 0.0, cells: { "0": "7" }, inTable: true },            // 0
  { edss: 1.0, cells: { "1": "1" }, inTable: true },            // 1
  { edss: 1.5, cells: { "1": "2–7" }, inTable: true },          // 2
  { edss: 2.0, cells: { "2": "1" }, inTable: true },            // 3
  { edss: 2.5, cells: { "2": "2" }, inTable: true },            // 4
  { edss: 3.0, cells: { "2": "3–4" }, inTable: true },          // 5
  { edss: 3.0, cells: { "2": "0", "3": "1" }, inTable: true },  // 6
  { edss: 3.5, cells: { "2": "5" }, inTable: true },            // 7
  { edss: 3.5, cells: { "2": "1–2", "3": "1" }, inTable: true },// 8
  { edss: 3.5, cells: { "2": "0", "3": "2" }, inTable: true },  // 9
  { edss: 4.0, cells: { "2": "6–7" }, inTable: true },          // 10
  { edss: 4.0, cells: { "3": "2–4" }, inTable: true },          // 11
  { edss: 4.0, cells: { "2": "0", "3": "0", "4": "1" }, inTable: true }, // 12
  { edss: 4.0, cells: { "2": "3–6", "3": "1" }, inTable: false },// 13
  { edss: 4.5, cells: { "3": "5" }, inTable: true },            // 14
  { edss: 4.5, cells: { "3": "1–2", "4": "1" }, inTable: true },// 15
  { edss: 4.5, cells: { "2": "1–6", "3": "0", "4": "1" }, inTable: false }, // 16
  { edss: 5.0, cells: { "3": "6–7" }, inTable: true },          // 17
  { edss: 5.0, cells: { "4": "2–7" }, inTable: true },          // 18
  { edss: 5.0, cells: { "3": "3–6", "4": "1" }, inTable: false },// 19
  { edss: 5.0, cells: { "5": "1–7" }, inTable: true },          // 20
];

export function computeFSStep(correctedValues: Record<string, number>): { edss: number; row: number } {
  const v = Object.values(correctedValues);
  const n = (grade: number) => v.filter((x) => x === grade).length;
  const n2 = n(2), n3 = n(3), n4 = n(4);
  const n5plus = v.filter((x) => x >= 5).length;

  let row: number;
  if (n5plus >= 1) row = 20;
  else if (n4 >= 2) row = 18;
  else if (n4 === 1) {
    if (n3 === 0) row = n2 === 0 ? 12 : 16;
    else row = n3 <= 2 ? 15 : 19;
  }
  else if (n3 >= 6) row = 17;
  else if (n3 === 5) row = 14;
  else if (n3 >= 3) row = 11;
  else if (n3 === 2) row = n2 === 0 ? 9 : 11;
  else if (n3 === 1) row = n2 === 0 ? 6 : n2 <= 2 ? 8 : 13;
  else if (n2 >= 6) row = 10;
  else if (n2 === 5) row = 7;
  else if (n2 >= 3) row = 5;
  else if (n2 === 2) row = 4;
  else if (n2 === 1) row = 3;
  else if (n(1) >= 2) row = 2;
  else if (n(1) === 1) row = 1;
  else row = 0;

  return { edss: FS_STEP_ROWS[row].edss, row };
}

// ----------------------------------------------------------------------------
// Ambulation
// ----------------------------------------------------------------------------

export type AmbulationResult = {
  // Neurostatus ambulation score (0–15); 10 is also used for "bilateral aid, < 5 m"
  score: number;
  // Minimum EDSS step implied by ambulation
  minEDSS: number;
  // true when the EDSS step is defined by ambulation alone (EDSS ≥ 5.5)
  exclusive: boolean;
};

export function computeAmbulation(assistance: AssistanceId, distanceNoAid: number | null, restricted: boolean): AmbulationResult | null {
  switch (assistance) {
    case "uni_50_plus": return { score: 6, minEDSS: 6.0, exclusive: true };
    case "bi_120_plus": return { score: 7, minEDSS: 6.0, exclusive: true };
    case "uni_under_50": return { score: 8, minEDSS: 6.5, exclusive: true };
    case "bi_5_to_120": return { score: 9, minEDSS: 6.5, exclusive: true };
    case "bi_under_5": return { score: 10, minEDSS: 7.0, exclusive: true };
    case "wheel_self": return { score: 10, minEDSS: 7.0, exclusive: true };
    case "wheel_some_help": return { score: 11, minEDSS: 7.5, exclusive: true };
    case "wheel_dependent": return { score: 12, minEDSS: 8.0, exclusive: true };
    case "bed_chair_arms_ok": return { score: 12, minEDSS: 8.0, exclusive: true };
    case "bed_chair_limited_arms": return { score: 13, minEDSS: 8.5, exclusive: true };
    case "helpless": return { score: 14, minEDSS: 9.0, exclusive: true };
    case "total_care": return { score: 15, minEDSS: 9.5, exclusive: true };
  }

  if (distanceNoAid == null || distanceNoAid >= 500) {
    // 0 = unrestricted; 1 = fully ambulatory (≥ 500 m) but not unrestricted
    return restricted ? { score: 1, minEDSS: 2.0, exclusive: false } : null;
  }
  if (distanceNoAid >= 300) return { score: 2, minEDSS: 4.5, exclusive: false };
  if (distanceNoAid >= 200) return { score: 3, minEDSS: 5.0, exclusive: false };
  if (distanceNoAid >= 100) return { score: 4, minEDSS: 5.5, exclusive: true };
  return { score: 5, minEDSS: 6.0, exclusive: true };
}

// ----------------------------------------------------------------------------
// Final EDSS
// ----------------------------------------------------------------------------

export type EDSSResult = {
  edss: number;
  fsStep: { edss: number; row: number };
  ambulation: AmbulationResult | null;
  // Which component determined the final step
  determinedBy: "fs" | "ambulation" | "both";
};

export function computeEDSSFromInputs(fs: Record<string, number>, assistance: AssistanceId, distanceNoAid: number | null, restricted = false): EDSSResult {
  const fsStep = computeFSStep(correctedFS(fs));
  const ambulation = computeAmbulation(assistance, distanceNoAid, restricted);

  if (!ambulation) return { edss: fsStep.edss, fsStep, ambulation, determinedBy: "fs" };

  // EDSS steps ≥ 5.5 are exclusively defined by ambulation
  const edss = ambulation.exclusive ? ambulation.minEDSS : Math.max(fsStep.edss, ambulation.minEDSS);
  const determinedBy = ambulation.exclusive || ambulation.minEDSS > fsStep.edss ? "ambulation"
    : ambulation.minEDSS === fsStep.edss ? "both" : "fs";
  return { edss, fsStep, ambulation, determinedBy };
}
