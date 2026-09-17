// ============================================================================
// ASSESSMENT: FORM STATE → FS SCORES → EDSS
// ============================================================================

import { suggestV, suggestBS, suggestP, suggestC, suggestS, suggestBB, suggestM } from "./scoring";
import { computeEDSSFromInputs, type EDSSResult } from "./edss";
import type { FormState } from "./state";

export const FS_KEYS = ["V", "BS", "P", "C", "S", "BB", "M"] as const;
export type FSKey = typeof FS_KEYS[number];
export type FSScores = Record<FSKey, number>;

export const FS_MAX: FSScores = { V: 6, BS: 5, P: 6, C: 5, S: 6, BB: 6, M: 5 };

export type Assessment = {
  // Scores suggested from the examination findings
  suggested: FSScores;
  // Scores used for the EDSS (suggested, unless manually overridden)
  fs: FSScores;
  overridden: Record<FSKey, boolean>;
  distance: number | null;
  result: EDSSResult;
};

export function parseDistance(distance: string): number | null {
  if (distance.trim() === "") return null;
  const n = Number(distance);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), 2000) : null;
}

export function assess(state: FormState): Assessment {
  const suggested: FSScores = {
    V: suggestV(state.visual),
    BS: suggestBS(state.brainstem),
    P: suggestP(state.pyramidal),
    C: suggestC(state.cerebellar),
    S: suggestS(state.sensory),
    BB: suggestBB(state.bb),
    M: suggestM(state.mental),
  };
  const fs = { ...suggested };
  const overridden = Object.fromEntries(FS_KEYS.map((k) => [k, false])) as Record<FSKey, boolean>;
  for (const key of FS_KEYS) {
    const value = state.overrides[key];
    if (value !== undefined) {
      fs[key] = value;
      overridden[key] = true;
    }
  }
  const distance = parseDistance(state.walkingDistance);
  const result = computeEDSSFromInputs(fs, state.assistance, distance, state.ambulationRestricted);
  return { suggested, fs, overridden, distance, result };
}
