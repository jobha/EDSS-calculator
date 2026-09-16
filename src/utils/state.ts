// ============================================================================
// FORM STATE: DEFAULTS, SERIALIZATION AND MIGRATION
// ============================================================================

import LZString from "lz-string";
import type { AssistanceId } from "../types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm, MuscleGroup } from "../types/forms";
import { ARM_MUSCLES, LEG_MUSCLES } from "../types/forms";
import { FS_KEYS, FS_MAX, type FSScores } from "./assessment";

export type FormState = {
  visual: VisualForm;
  brainstem: BrainstemForm;
  pyramidal: PyramidalForm;
  cerebellar: CerebellarForm;
  sensory: SensoryForm;
  bb: BowelBladderForm;
  mental: MentalForm;
  assistance: AssistanceId;
  walkingDistance: string;
  ambulationRestricted: boolean;
  // Manually overridden FS scores
  overrides: Partial<FSScores>;
};

export const DEFAULT_STATE: FormState = {
  visual: { leftEyeAcuity: "1.0", rightEyeAcuity: "1.0", visualFieldDeficit: "none", scotoma: 0, discPallor: false },
  brainstem: { eyeMotilityLevel: 0, nystagmus: "none", ino: false, facialSensLeft: 0, facialSensRight: 0, facialSymLeft: 0, facialSymRight: 0, hearingLeft: 0, hearingRight: 0, dysarthriaLevel: 0, dysphagiaLevel: 0, otherCranialNerves: 0 },
  pyramidal: { ...Object.fromEntries([...ARM_MUSCLES, ...LEG_MUSCLES].flatMap((m) => [[`${m}R`, 5], [`${m}L`, 5]])) as { [K in `${MuscleGroup}${"R" | "L"}`]: number }, hyperreflexiaLeft:false, hyperreflexiaRight:false, babinskiLeft:false, babinskiRight:false, clonusLeft:false, clonusRight:false, spasticGait:false, fatigability:false },
  cerebellar: { headTremor: 0, truncalAtaxia: 0, limbAtaxiaRightArm: 0, limbAtaxiaLeftArm: 0, limbAtaxiaRightLeg: 0, limbAtaxiaLeftLeg: 0, tandemWalking: 0, gaitAtaxia: 0, romberg: 0, otherCerebellar: 0, inabilityCoordinatedMovements: false },
  sensory: { vibSeverity: "normal", vibCount: 0, vibRightArm: false, vibLeftArm: false, vibRightLeg: false, vibLeftLeg: false, ptSeverity: "normal", ptCount: 0, ptRightArm: false, ptLeftArm: false, ptRightLeg: false, ptLeftLeg: false, jpSeverity: "normal", jpCount: 0, jpRightArm: false, jpLeftArm: false, jpRightLeg: false, jpLeftLeg: false },
  bb: { urinaryHesitancy: 0, urinaryUrgency: 0, catheterisation: "none", bowelDysfunction: 0 },
  mental: { mildFatigue: false, moderateToSevereFatigue: false, signsOnlyCognition: false, lightlyReducedCognition: false, moderatelyReducedCognition: false, markedlyReducedCognition: false, pronouncedDementia: false },
  assistance: "none",
  walkingDistance: "500",
  ambulationRestricted: false,
  overrides: {},
};

const STATE_VERSION = 3;

// Remove default values from object (recursive)
function removeDefaults(obj: any, defaults: any): any {
  if (obj === defaults) return undefined;
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj;

  const result: any = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const defaultValue = defaults?.[key];
    if (value === defaultValue) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = removeDefaults(value, defaultValue);
      if (nested !== undefined && Object.keys(nested).length > 0) result[key] = nested;
    } else {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// Merge cleaned state with defaults (recursive)
function mergeWithDefaults(obj: any, defaults: any): any {
  if (typeof defaults !== 'object' || defaults === null) return obj ?? defaults;
  if (Array.isArray(defaults)) return obj ?? defaults;

  const result: any = { ...defaults };
  if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      if (!(key in defaults)) continue;
      result[key] = typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])
        ? mergeWithDefaults(obj[key], defaults[key])
        : obj[key];
    }
  }
  return result;
}

export function encodeState(state: FormState): string {
  const cleaned = removeDefaults(state, DEFAULT_STATE) || {};
  return `v${STATE_VERSION}:` + LZString.compressToBase64(JSON.stringify(cleaned));
}

export function decodeState(input: string): FormState | null {
  const match = input.trim().match(/^v(\d+):(.+)$/s);
  if (!match) return null;
  const version = Number(match[1]);
  if (version < 1 || version > STATE_VERSION) return null;
  const decompressed = LZString.decompressFromBase64(match[2]);
  if (!decompressed) return null;
  try {
    return migrateState(version, JSON.parse(decompressed));
  } catch {
    return null;
  }
}

// Converts a saved (defaults-stripped) state of an older version to the current full state.
export function migrateState(version: number, saved: any): FormState {
  let state = saved ?? {};
  if (version < 2) state = migrateV1(state);
  if (version < 3) state = migrateV2(state);
  const merged: FormState = mergeWithDefaults(state, DEFAULT_STATE);
  merged.overrides = sanitizeOverrides(state.overrides);
  return merged;
}

function sanitizeOverrides(saved: any): Partial<FSScores> {
  const overrides: Partial<FSScores> = {};
  for (const key of FS_KEYS) {
    const value = saved?.[key];
    if (Number.isInteger(value) && value >= 0 && value <= FS_MAX[key]) overrides[key] = value;
  }
  return overrides;
}

// Version 2 used 12 muscle groups per side; version 3 uses the 10 groups of the scoring sheet.
// Each new group takes the weakest of the old movements mapped to it.
const V2_MUSCLES: Record<MuscleGroup, string[]> = {
  deltoid: ["shoulderAbduction", "shoulderExternalRotation"],
  biceps: ["elbowFlexion"],
  triceps: ["elbowExtension"],
  wristFingerFlexors: ["fingerAbduction"],
  wristFingerExtensors: ["wristExtension"],
  hipFlexors: ["hipFlexion", "hipAbduction"],
  kneeFlexors: ["kneeFlexion"],
  kneeExtensors: ["kneeExtension"],
  plantarFlexion: ["anklePlantarflexion"],
  dorsiflexion: ["ankleDorsiflexion"],
};

function migrateV2(saved: any): any {
  const oldP = saved.pyramidal ?? {};
  const pyramidal: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(oldP)) {
    if (typeof value === "boolean") pyramidal[key] = value;
  }
  for (const [group, oldNames] of Object.entries(V2_MUSCLES)) {
    for (const side of ["R", "L"]) {
      const grades = oldNames.map((name) => oldP[name + side]).filter((v): v is number => typeof v === "number");
      if (grades.length > 0) pyramidal[group + side] = Math.min(...grades);
    }
  }
  return { ...saved, pyramidal };
}

// Version 1 used checklists for cerebellar and bowel/bladder findings and a 0–4 scale
// (without "signs only") for dysarthria and dysphagia.
function migrateV1(saved: any): any {
  const { cerebellar: oldC = {}, bb: oldBB = {}, brainstem: oldBS = {}, ...rest } = saved;
  const state = { ...rest };

  // Sensory: vibration and position sense have a single "marked" (complete loss) level
  if (state.sensory) {
    state.sensory = { ...state.sensory };
    if (state.sensory.vibSeverity === "absent") state.sensory.vibSeverity = "marked";
    if (state.sensory.jpSeverity === "absent") state.sensory.jpSeverity = "marked";
  }

  // Brainstem: v1 levels 1–4 correspond to Neurostatus 2–5
  const shift = (level: unknown) => (typeof level === "number" && level > 0 ? Math.min(level + 1, 5) : 0);
  state.brainstem = { ...oldBS, dysarthriaLevel: shift(oldBS.dysarthriaLevel), dysphagiaLevel: shift(oldBS.dysphagiaLevel) };

  // Cerebellar
  const c = { ...DEFAULT_STATE.cerebellar };
  if (oldC.fingerNoseRightArm) c.limbAtaxiaRightArm = 2;
  if (oldC.fingerNoseLeftArm) c.limbAtaxiaLeftArm = 2;
  if (oldC.heelKneeRightLeg) c.limbAtaxiaRightLeg = 2;
  if (oldC.heelKneeLeftLeg) c.limbAtaxiaLeftLeg = 2;
  if (oldC.limbAtaxiaAffectsFunction) {
    const limbKeys = ["limbAtaxiaRightArm", "limbAtaxiaLeftArm", "limbAtaxiaRightLeg", "limbAtaxiaLeftLeg"] as const;
    const affected = limbKeys.filter((k) => c[k] > 0);
    for (const k of affected.length > 0 ? affected : limbKeys.slice(0, 1)) c[k] = 3;
  }
  if (oldC.ataxiaThreeOrFourLimbs) {
    c.limbAtaxiaRightArm = c.limbAtaxiaLeftArm = c.limbAtaxiaRightLeg = c.limbAtaxiaLeftLeg = 4;
  }
  if (oldC.rombergFallTendency) c.romberg = 2;
  if (oldC.lineWalkDifficulty) c.tandemWalking = 1;
  if (oldC.mildCerebellarSignsNoFunction) c.otherCerebellar = 1;
  if (oldC.gaitAtaxia) c.gaitAtaxia = 3;
  if (oldC.needsAssistanceDueAtaxia) c.gaitAtaxia = 4;
  if (oldC.truncalAtaxiaEO) c.truncalAtaxia = 3;
  if (oldC.inabilityCoordinatedMovements) c.inabilityCoordinatedMovements = true;
  state.cerebellar = c;

  // Bowel/bladder
  const bb = { ...DEFAULT_STATE.bb };
  const urgency = [oldBB.mildUrge && 1, (oldBB.moderateUrge || oldBB.rareIncontinence) && 2, oldBB.frequentIncontinence && 3, oldBB.lossBladderFunction && 4];
  const bowel = [oldBB.mildConstipation && 1, (oldBB.moderateConstipation || oldBB.severeConstipation || oldBB.bowelIncontinenceWeekly) && 2, oldBB.needsHelpForBowelMovement && 3, oldBB.lossBowelFunction && 4];
  bb.urinaryUrgency = Math.max(0, ...urgency.map(Number).filter(Number.isFinite)) as BowelBladderForm["urinaryUrgency"];
  bb.bowelDysfunction = Math.max(0, ...bowel.map(Number).filter(Number.isFinite)) as BowelBladderForm["bowelDysfunction"];
  bb.catheterisation = oldBB.permanentCatheter ? "indwelling" : oldBB.intermittentCatheterization ? "intermittent" : "none";
  state.bb = bb;

  return state;
}
