// ============================================================================
// FORM TYPE DEFINITIONS
// ============================================================================

import type { EyeAcuity, Severity } from './edss';

export type VisualForm = {
  leftEyeAcuity: EyeAcuity;
  rightEyeAcuity: EyeAcuity;
  visualFieldDeficit: "none" | "mild" | "moderate" | "marked";
};

export type BrainstemForm = {
  // Eye motility
  eyeMotilityLevel: 0 | 1 | 2 | 3 | 4;
  // Nystagmus
  nystagmus: "none" | "mild" | "clear" | "spontaneous";
  ino: boolean;
  // Facial sensibility (separate levels for each side)
  facialSensLeft: 0 | 1 | 2 | 3 | 4;
  facialSensRight: 0 | 1 | 2 | 3 | 4;
  // Facial symmetry (separate levels for each side)
  facialSymLeft: 0 | 1 | 2 | 3 | 4;
  facialSymRight: 0 | 1 | 2 | 3 | 4;
  // Hearing (separate levels for each side)
  hearingLeft: 0 | 1 | 2 | 3 | 4;
  hearingRight: 0 | 1 | 2 | 3 | 4;
  // Speech/swallowing
  dysarthriaLevel: 0 | 1 | 2 | 3 | 4;
  dysphagiaLevel: 0 | 1 | 2 | 3 | 4;
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
  // Finger-nose test
  fingerNoseRightArm: boolean;
  fingerNoseLeftArm: boolean;
  // Heel-knee test
  heelKneeRightLeg: boolean;
  heelKneeLeftLeg: boolean;
  // Other cerebellar signs
  rombergFallTendency: boolean;
  lineWalkDifficulty: boolean;
  limbAtaxiaAffectsFunction: boolean;
  gaitAtaxia: boolean;
  truncalAtaxiaEO: boolean;
  needsAssistanceDueAtaxia: boolean;
  ataxiaThreeOrFourLimbs: boolean;
  inabilityCoordinatedMovements: boolean;
  mildCerebellarSignsNoFunction: boolean;
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

export type BowelBladderForm = {
  // Bladder symptoms
  mildUrge: boolean;
  moderateUrge: boolean;
  rareIncontinence: boolean;
  frequentIncontinence: boolean;
  intermittentCatheterization: boolean;
  permanentCatheter: boolean;
  lossBladderFunction: boolean;
  // Bowel symptoms
  mildConstipation: boolean;
  moderateConstipation: boolean;
  severeConstipation: boolean;
  needsHelpForBowelMovement: boolean;
  bowelIncontinenceWeekly: boolean;
  lossBowelFunction: boolean;
};

export type MentalForm = {
  // Fatigue
  mildFatigue: boolean;
  moderateToSevereFatigue: boolean;
  // Cognition
  lightlyReducedCognition: boolean;
  moderatelyReducedCognition: boolean;
  markedlyReducedCognition: boolean;
  pronouncedDementia: boolean;
};
