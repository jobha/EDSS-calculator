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

export const REFLEXES = ["biceps", "triceps", "brachioradialis", "knee", "ankle"] as const;
export type Reflex = typeof REFLEXES[number];

type Sided<Name extends string, T> = { [K in `${Name}${"R" | "L"}`]: T };

// Items graded per side on the scoring sheet, with their normal (default) value
export const PYRAMIDAL_SIDED_DEFAULTS = {
  plantar: 0,          // 0 flexor, 1 neutral/equivocal, 2 extensor
  cutaneous: 0,        // 0 normal, 1 weak, 2 absent
  palmomental: 0,      // 0 absent, 1 present (optional)
  pronation: 0,        // position test UE, pronation 0–2 (optional)
  downwardDrift: 0,    // position test UE, downward drift 0–2 (optional)
  legSinking: 0,       // position test LE, sinking 0–4 (optional)
  heelWalking: 0,      // 0–2 (optional)
  toeWalking: 0,       // 0–2 (optional)
  hopping: 0,          // 0–3 (optional)
  spasticityArms: 0,   // 0–4
  spasticityLegs: 0,   // 0–4
} as const;
export type PyramidalSidedItem = keyof typeof PYRAMIDAL_SIDED_DEFAULTS;

// BMRC grade 0–5 per muscle group and side (e.g. deltoidR), reflexes 0–5 (e.g. reflexKneeL, 2 = normal)
export type PyramidalForm =
  Sided<MuscleGroup, number> &
  Sided<`reflex${Capitalize<Reflex>}`, number> &
  Sided<PyramidalSidedItem, number> & {
  // Angle (°) when able to lift only one leg at a time; free text, optional
  legLiftDegreesR: string;
  legLiftDegreesL: string;
  gaitSpasticity: number;            // 0–3
  overallMotorPerformance: number;   // 0–2
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
  // Documented only; do not count towards the Sensory FS
  lhermitte: boolean;
  paraesthesiaeArmR: boolean;
  paraesthesiaeArmL: boolean;
  paraesthesiaeTrunkR: boolean;
  paraesthesiaeTrunkL: boolean;
  paraesthesiaeLegR: boolean;
  paraesthesiaeLegL: boolean;
};

export type CatheterisationLevel = "none" | "intermittent" | "almostConstant" | "indwelling";

export type BowelBladderForm = {
  urinaryHesitancy: 0 | 1 | 2 | 3 | 4;
  urinaryUrgency: 0 | 1 | 2 | 3 | 4;
  catheterisation: CatheterisationLevel;
  bowelDysfunction: 0 | 1 | 2 | 3 | 4;
  // Documented only; does not count towards the Bowel/Bladder FS
  sexualDysfunction: 0 | 1 | 2 | 3 | 4;
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
  // Documented only; do not count towards the Cerebral FS or EDSS
  depression: boolean;
  euphoria: boolean;
};
