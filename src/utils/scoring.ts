// ============================================================================
// FUNCTIONAL SYSTEM SCORING FUNCTIONS
// ============================================================================

import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm } from "../types/forms";
import { acuityToNumeric } from "./formatting";

// Visual functional system scoring
export function suggestV(fs: VisualForm): number {
  const leftNumeric = acuityToNumeric(fs.leftEyeAcuity);
  const rightNumeric = acuityToNumeric(fs.rightEyeAcuity);

  const bestEyeNumeric = Math.max(leftNumeric, rightNumeric);
  const worstEyeNumeric = Math.min(leftNumeric, rightNumeric);

  if (bestEyeNumeric < 0.33) return 6;
  if (worstEyeNumeric < 0.1 && bestEyeNumeric > 0.33) return 5;
  if ((worstEyeNumeric >= 0.1 && worstEyeNumeric <= 0.2 && bestEyeNumeric > 0.33) || fs.visualFieldDeficit === "marked") return 4;
  if ((worstEyeNumeric >= 0.21 && worstEyeNumeric <= 0.33) || fs.visualFieldDeficit === "moderate") return 3;
  if (worstEyeNumeric >= 0.34 && worstEyeNumeric <= 0.67) return 2;
  if ((worstEyeNumeric > 0.67 && worstEyeNumeric < 1.0) || fs.visualFieldDeficit === "mild") return 1;
  return 0;
}

// Brainstem functional system scoring (holistic assessment)
export function suggestBS(fs: BrainstemForm): number {
  // Convert nystagmus to numeric level
  const nystagmusLevel = fs.nystagmus === "spontaneous" ? 3 : fs.nystagmus === "clear" ? 2 : fs.nystagmus === "mild" ? 1 : 0;
  const inoLevel = fs.ino ? 1 : 0;

  // Get max level from each side for facial sens, sym, hearing
  const facialSensLevel = Math.max(fs.facialSensLeft, fs.facialSensRight);
  const facialSymLevel = Math.max(fs.facialSymLeft, fs.facialSymRight);
  const hearingLevel = Math.max(fs.hearingLeft, fs.hearingRight);

  const maxLevel = Math.max(
    fs.eyeMotilityLevel,
    nystagmusLevel,
    inoLevel,
    facialSensLevel,
    facialSymLevel,
    hearingLevel,
    fs.dysarthriaLevel,
    fs.dysphagiaLevel
  );

  // FS 5: Unable to swallow or speak
  if (fs.dysphagiaLevel === 4 || fs.dysarthriaLevel === 4) return 5;

  // FS 4: Marked dysarthria or other marked deficits
  if (fs.dysarthriaLevel >= 3 || maxLevel === 4) return 4;

  // FS 3: Severe/spontaneous nystagmus, marked eye muscle paresis, or moderate deficits in other cranial nerves
  if (nystagmusLevel === 3 || fs.eyeMotilityLevel === 3 || maxLevel === 3) return 3;

  // FS 2: Clear nystagmus or other mild deficits
  if (nystagmusLevel === 2 || maxLevel === 2) return 2;

  // FS 1: Abnormal findings on clinical examination without symptoms or functional loss
  if (maxLevel === 1) return 1;

  return 0;
}

export function suggestP(fs: PyramidalForm): number {
  const vals = [
    // Upper
    fs.shoulderAbductionR, fs.shoulderAbductionL,
    fs.shoulderExternalRotationR, fs.shoulderExternalRotationL,
    fs.elbowFlexionR, fs.elbowFlexionL,
    fs.elbowExtensionR, fs.elbowExtensionL,
    fs.wristExtensionR, fs.wristExtensionL,
    fs.fingerAbductionR, fs.fingerAbductionL,
    // Lower
    fs.hipFlexionR, fs.hipFlexionL,
    fs.hipAbductionR, fs.hipAbductionL,
    fs.kneeExtensionR, fs.kneeExtensionL,
    fs.kneeFlexionR, fs.kneeFlexionL,
    fs.ankleDorsiflexionR, fs.ankleDorsiflexionL,
    fs.anklePlantarflexionR, fs.anklePlantarflexionL,
  ];
  const minStrength = Math.min(...vals);
  const countEq = (n:number)=> vals.filter(v=>v===n).length;
  const countLe = (n:number)=> vals.filter(v=>v<=n).length;

  // 0
  const hasUMNSigns = fs.hyperreflexiaLeft || fs.hyperreflexiaRight || fs.babinskiLeft || fs.babinskiRight || fs.clonusLeft || fs.clonusRight;
  if (minStrength===5 && !hasUMNSigns && !fs.spasticGait && !fs.fatigability) return 0;
  // 1: UMN signs only (no spastic gait, no fatigability)
  if (minStrength===5 && hasUMNSigns && !fs.spasticGait && !fs.fatigability) return 1;
  // 2: spastic gait OR minimal weakness OR fatigability
  if (fs.spasticGait && minStrength>=4) return 2;
  if (minStrength===4 && countEq(4)<=2) return 2;
  if (fs.fatigability && minStrength>=4) return 2;
  // 3: mild–moderate paresis
  if (countEq(3)>=1 && countEq(3)<=2) return 3;
  if (minStrength===4 && countEq(4)>2) return 3;
  if (countEq(2)===1) return 3;
  // 4: marked hemi/paraparesis or mono-plegia 0–1 in one limb or moderate tetraparesis
  const limbsLe2 = countLe(2);
  if (limbsLe2>=2 || minStrength<=1) return 4;
  const limbsEq3 = countEq(3);
  if (limbsEq3>=3) return 4;
  // 5: paraplegia (0–1 both legs) or marked tetraparesis (≤2 in ≥3 limbs)
  const legCore = [
    fs.hipFlexionR, fs.hipFlexionL,
    fs.kneeExtensionR, fs.kneeExtensionL,
    fs.ankleDorsiflexionR, fs.ankleDorsiflexionL,
  ];
  const legsLe1 = legCore.filter(v=>v<=1).length;
  if (legsLe1>=2) return 5;
  if (countLe(2)>=3) return 5;
  // 6: tetraplegia (≤1 in all limbs)
  if (vals.every(v=>v<=1)) return 6;
  return 0;
}

export function suggestC(fs: CerebellarForm): number {
  // Count affected limbs from finger-nose and heel-knee tests
  const ataxiaLimbCount = [
    fs.fingerNoseRightArm,
    fs.fingerNoseLeftArm,
    fs.heelKneeRightLeg,
    fs.heelKneeLeftLeg
  ].filter(Boolean).length;

  // Standalone high grades
  if (fs.inabilityCoordinatedMovements) return 5;
  if (fs.ataxiaThreeOrFourLimbs || ataxiaLimbCount >= 3) return 4;
  if (fs.needsAssistanceDueAtaxia) return 4;
  // Moderate impact
  if (fs.limbAtaxiaAffectsFunction || fs.gaitAtaxia || fs.truncalAtaxiaEO) return 3;
  // Mild objective signs - ataxia on testing or other mild signs
  if (ataxiaLimbCount > 0 || fs.rombergFallTendency || fs.lineWalkDifficulty) return 2;
  // Minimal symptoms only
  if (fs.mildCerebellarSignsNoFunction) return 1;
  return 0;
}

export function suggestS(fs: SensoryForm): number {
  const sevRank = { normal: 0, mild: 1, moderate: 2, marked: 3, absent: 4 } as const;
  const sV = sevRank[fs.vibSeverity];
  const sP = sevRank[fs.ptSeverity];
  const sJ = sevRank[fs.jpSeverity];
  const cV = fs.vibCount|0; const cP = fs.ptCount|0; const cJ = fs.jpCount|0;

  // If all modalities normal or counts zero → 0
  if ((sV===0||cV===0) && (sP===0||cP===0) && (sJ===0||cJ===0)) return 0;

  // Global rule: all three modalities absent → 6
  if (sV===4 && cV>0 && sP===4 && cP>0 && sJ===4 && cJ>0) return 6;

  // Per-modality scoring
  const scoreVibration = () => {
    if (sV===0 || cV===0) return 0;
    // FS 5: Absent (3-4 limbs based on guidelines)
    if (sV===4 && cV>=3) return 5;
    // FS 4: Marked 3-4
    if (sV===3 && cV>=3) return 4;
    // FS 3: Absent 1-2 OR Moderate 3-4
    if (sV===4 && cV<=2) return 3;
    if (sV===2 && cV>=3) return 3;
    // FS 2: Moderate 1-2 OR Mild 3-4
    if (sV===2 && cV<=2) return 2;
    if (sV===1 && cV>=3) return 2;
    // FS 1: Mild 1-2
    if (sV===1 && cV<=2) return 1;
    return 0;
  };

  const scorePainTouch = () => {
    if (sP===0 || cP===0) return 0;
    // FS 5: Totally absent 1-2 OR Marked 3-4
    if (sP===4 && cP<=2) return 5;
    if (sP===3 && cP>=3) return 5;
    // FS 4: Marked 1-2 OR Moderate 3-4
    if (sP===3 && cP<=2) return 4;
    if (sP===2 && cP>=3) return 4;
    // FS 3: Moderate 1-2 OR Mild 3-4
    if (sP===2 && cP<=2) return 3;
    if (sP===1 && cP>=3) return 3;
    // FS 2: Mild 1-2 (patient reports)
    if (sP===1 && cP<=2) return 2;
    // FS 1: Only signs on exam, patient doesn't report
    // This would need a separate checkbox/indicator in the form
    return 0;
  };

  const scoreJointPosition = () => {
    if (sJ===0 || cJ===0) return 0;
    // FS 5: Absent in at least 2
    if (sJ===4 && cJ>=2) return 5;
    // FS 4: Marked 3-4
    if (sJ===3 && cJ>=3) return 4;
    // FS 3: Moderate 1-2 OR Mild 3-4
    if (sJ===2 && cJ<=2) return 3;
    if (sJ===1 && cJ>=3) return 3;
    // FS 2: Mild 1-2
    if (sJ===1 && cJ<=2) return 2;
    return 0;
  };

  let score = Math.max(scoreVibration(), scorePainTouch(), scoreJointPosition());

  // Hierarchy floors:
  // - Any joint position affected → FS ≥2
  if (sJ>0 && cJ>0) score = Math.max(score, 2);
  // - Any modality affecting ≥3 limbs → FS ≥2
  if ((sV>0 && cV>=3) || (sP>0 && cP>=3) || (sJ>0 && cJ>=3)) score = Math.max(score, 2);

  return score;
}

export function suggestBB(fs: BowelBladderForm): number {
  // FS 6: Loss of both bladder AND bowel function
  if (fs.lossBladderFunction && fs.lossBowelFunction) return 6;
  // FS 5: Loss of bladder OR bowel function (but not both) OR permanent catheter
  if (fs.lossBladderFunction || fs.lossBowelFunction || fs.permanentCatheter) return 5;
  // FS 4: Weekly bowel incontinence
  if (fs.bowelIncontinenceWeekly) return 4;
  // FS 3: Frequent incontinence OR intermittent catheterization OR needs help for bowel movement
  if (fs.frequentIncontinence || fs.intermittentCatheterization || fs.needsHelpForBowelMovement) return 3;
  // FS 2: Moderate urge OR moderate constipation OR rare incontinence OR severe constipation
  if (fs.moderateUrge || fs.moderateConstipation || fs.rareIncontinence || fs.severeConstipation) return 2;
  // FS 1: Mild urge OR mild constipation
  if (fs.mildUrge || fs.mildConstipation) return 1;
  return 0;
}

export function suggestM(fs: MentalForm): number {
  // FS 5: Pronounced dementia (confusion, totally disoriented)
  if (fs.pronouncedDementia) return 5;
  // FS 4: Markedly reduced cognition (not oriented for 1-2 of 3 dimensions)
  if (fs.markedlyReducedCognition) return 4;
  // FS 3: Moderately reduced cognition (reduced cognitive test, but oriented 3/3)
  if (fs.moderatelyReducedCognition) return 3;
  // FS 2: Moderate to severe fatigue OR lightly reduced cognition
  if (fs.moderateToSevereFatigue || fs.lightlyReducedCognition) return 2;
  // FS 1: Mild fatigue (affects <50% of daily activity)
  if (fs.mildFatigue) return 1;
  return 0;
}
