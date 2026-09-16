// ============================================================================
// FORM TYPE DEFINITIONS
// Subscores follow the Neurostatus definitions (version 04/10.2)
// ============================================================================

import type { EyeAcuity, Severity } from './edss';

export type VisualForm = {
  leftEyeAcuity: EyeAcuity;
  rightEyeAcuity: EyeAcuity;
  // 0 none, 1 signs only, 2 moderate (aware, incomplete hemianopia), 3 marked (complete homonymous hemianopia)
  visualFieldDeficit: "none" | "mild" | "moderate" | "marked";
  // 0 none, 1 small (formal testing only), 2 large (spontaneously reported)
  scotoma: 0 | 1 | 2;
  discPallor: boolean;
};

export type BrainstemForm = {
  // Extraocular movements (EOM) impairment 0–4
  eyeMotilityLevel: 0 | 1 | 2 | 3 | 4;
  // Nystagmus 0–3
  nystagmus: "none" | "mild" | "clear" | "spontaneous";
  ino: boolean;
  // Trigeminal damage 0–4 (per side)
  facialSensLeft: 0 | 1 | 2 | 3 | 4;
  facialSensRight: 0 | 1 | 2 | 3 | 4;
  // Facial weakness 0–4 (per side)
  facialSymLeft: 0 | 1 | 2 | 3 | 4;
  facialSymRight: 0 | 1 | 2 | 3 | 4;
  // Hearing loss 0–4 (per side)
  hearingLeft: 0 | 1 | 2 | 3 | 4;
  hearingRight: 0 | 1 | 2 | 3 | 4;
  // Dysarthria 0–5, dysphagia 0–5
  dysarthriaLevel: 0 | 1 | 2 | 3 | 4 | 5;
  dysphagiaLevel: 0 | 1 | 2 | 3 | 4 | 5;
  // Other cranial nerve functions 0–4
  otherCranialNerves: 0 | 1 | 2 | 3 | 4;
};

// Muscle groups as on the Neurostatus scoring sheet; the weakest muscle defines the group's grade
export const ARM_MUSCLES = ["deltoid", "biceps", "triceps", "wristFingerFlexors", "wristFingerExtensors"] as const;
export const LEG_MUSCLES = ["hipFlexors", "kneeFlexors", "kneeExtensors", "plantarFlexion", "dorsiflexion"] as const;
export type MuscleGroup = typeof ARM_MUSCLES[number] | typeof LEG_MUSCLES[number];

// BMRC grade 0–5 per muscle group and side, e.g. deltoidR
export type PyramidalForm = { [K in `${MuscleGroup}${"R" | "L"}`]: number } & {
  // Upper motor neuron signs
  hyperreflexiaLeft: boolean;
  hyperreflexiaRight: boolean;
  babinskiLeft: boolean;
  babinskiRight: boolean;
  clonusLeft: boolean;
  clonusRight: boolean;
  spasticGait: boolean;
  fatigability: boolean;
};

export type CerebellarForm = {
  headTremor: 0 | 1 | 2 | 3;
  truncalAtaxia: 0 | 1 | 2 | 3 | 4;
  // Limb ataxia (tremor/dysmetria and rapid alternating movements) 0–4 per limb
  limbAtaxiaRightArm: 0 | 1 | 2 | 3 | 4;
  limbAtaxiaLeftArm: 0 | 1 | 2 | 3 | 4;
  limbAtaxiaRightLeg: 0 | 1 | 2 | 3 | 4;
  limbAtaxiaLeftLeg: 0 | 1 | 2 | 3 | 4;
  tandemWalking: 0 | 1 | 2;
  gaitAtaxia: 0 | 1 | 2 | 3 | 4;
  romberg: 0 | 1 | 2 | 3;
  otherCerebellar: 0 | 1 | 2 | 3;
  inabilityCoordinatedMovements: boolean;
};

export type SensoryForm = {
  vibSeverity: Severity;
  vibCount: number;
  vibRightArm: boolean;
  vibLeftArm: boolean;
  vibRightLeg: boolean;
  vibLeftLeg: boolean;
  ptSeverity: Severity;
  ptCount: number;
  ptRightArm: boolean;
  ptLeftArm: boolean;
  ptRightLeg: boolean;
  ptLeftLeg: boolean;
  jpSeverity: Severity;
  jpCount: number;
  jpRightArm: boolean;
  jpLeftArm: boolean;
  jpRightLeg: boolean;
  jpLeftLeg: boolean;
};

export type CatheterisationLevel = "none" | "intermittent" | "almostConstant" | "indwelling";

export type BowelBladderForm = {
  urinaryHesitancy: 0 | 1 | 2 | 3 | 4;
  urinaryUrgency: 0 | 1 | 2 | 3 | 4;
  catheterisation: CatheterisationLevel;
  bowelDysfunction: 0 | 1 | 2 | 3 | 4;
};

export type MentalForm = {
  // Fatigue
  mildFatigue: boolean;
  moderateToSevereFatigue: boolean;
  // Decrease in mentation
  signsOnlyCognition: boolean;
  lightlyReducedCognition: boolean;
  moderatelyReducedCognition: boolean;
  markedlyReducedCognition: boolean;
  pronouncedDementia: boolean;
};
