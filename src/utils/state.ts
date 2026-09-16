// ============================================================================
// FORM STATE: DEFAULTS, SERIALIZATION AND MIGRATION
// ============================================================================

import LZString from "lz-string";
import type { AssistanceId } from "../types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm } from "../types/forms";

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
};

export const DEFAULT_STATE: FormState = {
  visual: { leftEyeAcuity: "1.0", rightEyeAcuity: "1.0", visualFieldDeficit: "none", scotoma: 0, discPallor: false },
  brainstem: { eyeMotilityLevel: 0, nystagmus: "none", ino: false, facialSensLeft: 0, facialSensRight: 0, facialSymLeft: 0, facialSymRight: 0, hearingLeft: 0, hearingRight: 0, dysarthriaLevel: 0, dysphagiaLevel: 0, otherCranialNerves: 0 },
  pyramidal: { shoulderAbductionR:5, shoulderAbductionL:5, shoulderExternalRotationR:5, shoulderExternalRotationL:5, elbowFlexionR:5, elbowFlexionL:5, elbowExtensionR:5, elbowExtensionL:5, wristExtensionR:5, wristExtensionL:5, fingerAbductionR:5, fingerAbductionL:5, hipFlexionR:5, hipFlexionL:5, hipAbductionR:5, hipAbductionL:5, kneeExtensionR:5, kneeExtensionL:5, kneeFlexionR:5, kneeFlexionL:5, ankleDorsiflexionR:5, ankleDorsiflexionL:5, anklePlantarflexionR:5, anklePlantarflexionL:5, hyperreflexiaLeft:false, hyperreflexiaRight:false, babinskiLeft:false, babinskiRight:false, clonusLeft:false, clonusRight:false, spasticGait:false, fatigability:false },
  cerebellar: { headTremor: 0, truncalAtaxia: 0, limbAtaxiaRightArm: 0, limbAtaxiaLeftArm: 0, limbAtaxiaRightLeg: 0, limbAtaxiaLeftLeg: 0, tandemWalking: 0, gaitAtaxia: 0, romberg: 0, otherCerebellar: 0, inabilityCoordinatedMovements: false },
  sensory: { vibSeverity: "normal", vibCount: 0, vibRightArm: false, vibLeftArm: false, vibRightLeg: false, vibLeftLeg: false, ptSeverity: "normal", ptCount: 0, ptRightArm: false, ptLeftArm: false, ptRightLeg: false, ptLeftLeg: false, jpSeverity: "normal", jpCount: 0, jpRightArm: false, jpLeftArm: false, jpRightLeg: false, jpLeftLeg: false },
  bb: { urinaryHesitancy: 0, urinaryUrgency: 0, catheterisation: "none", bowelDysfunction: 0 },
  mental: { mildFatigue: false, moderateToSevereFatigue: false, signsOnlyCognition: false, lightlyReducedCognition: false, moderatelyReducedCognition: false, markedlyReducedCognition: false, pronouncedDementia: false },
  assistance: "none",
  walkingDistance: "500",
  ambulationRestricted: false,
};

const STATE_VERSION = 2;

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
// Version 1 used checklists for cerebellar and bowel/bladder findings and a 0–4 scale
// (without "signs only") for dysarthria and dysphagia.
export function migrateState(version: number, saved: any): FormState {
  if (version >= STATE_VERSION) return mergeWithDefaults(saved, DEFAULT_STATE);

  const { cerebellar: oldC = {}, bb: oldBB = {}, brainstem: oldBS = {}, ...rest } = saved ?? {};
  const state: FormState = mergeWithDefaults(rest, DEFAULT_STATE);

  // Sensory: vibration and position sense have a single "marked" (complete loss) level
  if (state.sensory.vibSeverity === "absent") state.sensory.vibSeverity = "marked";
  if (state.sensory.jpSeverity === "absent") state.sensory.jpSeverity = "marked";

  // Brainstem: v1 levels 1–4 correspond to Neurostatus 2–5
  const shift = (level: unknown) => (typeof level === "number" && level > 0 ? Math.min(level + 1, 5) : 0);
  state.brainstem = mergeWithDefaults(
    { ...oldBS, dysarthriaLevel: shift(oldBS.dysarthriaLevel), dysphagiaLevel: shift(oldBS.dysphagiaLevel) },
    DEFAULT_STATE.brainstem,
  );

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
