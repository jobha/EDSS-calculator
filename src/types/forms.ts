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

export type PyramidalForm = {
  // Upper limb muscle strength scores
  shoulderAbductionR: number;
  shoulderAbductionL: number;
  shoulderExternalRotationR: number;
  shoulderExternalRotationL: number;
  elbowFlexionR: number;
  elbowFlexionL: number;
  elbowExtensionR: number;
  elbowExtensionL: number;
  wristExtensionR: number;
  wristExtensionL: number;
  fingerAbductionR: number;
  fingerAbductionL: number;
  // Lower limb muscle strength scores
  hipFlexionR: number;
  hipFlexionL: number;
  hipAbductionR: number;
  hipAbductionL: number;
  kneeExtensionR: number;
  kneeExtensionL: number;
  kneeFlexionR: number;
  kneeFlexionL: number;
  ankleDorsiflexionR: number;
  ankleDorsiflexionL: number;
  anklePlantarflexionR: number;
  anklePlantarflexionL: number;
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
