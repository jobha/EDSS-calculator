// ============================================================================
// VALIDATION & WARNINGS
// ============================================================================

import type { PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm, BrainstemForm, VisualForm } from "../types/forms";
import type { AssistanceId } from "../types/edss";

export type ValidationWarning = {
  type: 'warning' | 'info';
  category: 'fs-mismatch' | 'unusual-combination' | 'discordance' | 'suggestion';
  message: string;
};

type Translations = {
  warnPyramidalFSZero: string;
  warnPyramidalFSHigh: string;
  warnPyramidalFS6: string;
  warnCerebellarFSZero: string;
  warnCerebellarFSHigh: string;
  warnSensoryFSZero: string;
  warnSensoryFSHigh: string;
  warnBBFSZero: string;
  warnMentalFSZero: string;
  warnBrainstemFSZero: string;
  warnVisualFSZero: string;
  warnAmbulationUnusual: string;
  warnWalksButSevereFS: string;
  infoEDSSLowFSHigh: string;
  infoEDSSHighFSLow: string;
  suggestionDocumentDistance: string;
};

export function validateEDSSInputs(
  fs: Record<string, number>,
  assistance: AssistanceId,
  distance: number | null,
  pyramidal: PyramidalForm,
  cerebellar: CerebellarForm,
  sensory: SensoryForm,
  bb: BowelBladderForm,
  mental: MentalForm,
  brainstem: BrainstemForm,
  visual: VisualForm,
  edss: number,
  t: Translations
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // ========================================
  // 1. Pyramidal: Check FS vs weakness
  // ========================================
  const mrcScores = [
    pyramidal.shoulderAbductionR, pyramidal.shoulderAbductionL,
    pyramidal.shoulderExternalRotationR, pyramidal.shoulderExternalRotationL,
    pyramidal.elbowFlexionR, pyramidal.elbowFlexionL,
    pyramidal.elbowExtensionR, pyramidal.elbowExtensionL,
    pyramidal.wristExtensionR, pyramidal.wristExtensionL,
    pyramidal.fingerAbductionR, pyramidal.fingerAbductionL,
    pyramidal.hipFlexionR, pyramidal.hipFlexionL,
    pyramidal.hipAbductionR, pyramidal.hipAbductionL,
    pyramidal.kneeExtensionR, pyramidal.kneeExtensionL,
    pyramidal.kneeFlexionR, pyramidal.kneeFlexionL,
    pyramidal.ankleDorsiflexionR, pyramidal.ankleDorsiflexionL,
    pyramidal.anklePlantarflexionR, pyramidal.anklePlantarflexionL,
  ];
  const minMRC = Math.min(...mrcScores);
  const hasWeakness = minMRC < 5;
  const hasUMNSigns = pyramidal.hyperreflexiaLeft || pyramidal.hyperreflexiaRight ||
                      pyramidal.babinskiLeft || pyramidal.babinskiRight ||
                      pyramidal.clonusLeft || pyramidal.clonusRight ||
                      pyramidal.spasticGait || pyramidal.fatigability;

  if (fs.P === 0 && (hasWeakness || hasUMNSigns)) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnPyramidalFSZero
    });
  }

  if (fs.P >= 5 && !hasWeakness) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnPyramidalFSHigh
    });
  }

  if (fs.P === 6 && minMRC > 0) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnPyramidalFS6
    });
  }

  // ========================================
  // 2. Cerebellar: Check FS vs findings
  // ========================================
  const hasCerebellarFindings = cerebellar.tremorOrAtaxiaOnCoordTests ||
                                 cerebellar.rombergFallTendency ||
                                 cerebellar.lineWalkDifficulty ||
                                 cerebellar.limbAtaxiaAffectsFunction ||
                                 cerebellar.gaitAtaxia ||
                                 cerebellar.truncalAtaxiaEO ||
                                 cerebellar.needsAssistanceDueAtaxia ||
                                 cerebellar.ataxiaThreeOrFourLimbs ||
                                 cerebellar.inabilityCoordinatedMovements;

  if (fs.C === 0 && hasCerebellarFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnCerebellarFSZero
    });
  }

  if (fs.C >= 4 && !cerebellar.needsAssistanceDueAtaxia && !cerebellar.ataxiaThreeOrFourLimbs && !cerebellar.inabilityCoordinatedMovements) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnCerebellarFSHigh
    });
  }

  // ========================================
  // 3. Sensory: Check FS vs findings
  // ========================================
  const hasSensoryFindings = sensory.vibSeverity !== 'normal' ||
                              sensory.ptSeverity !== 'normal' ||
                              sensory.jpSeverity !== 'normal';

  if (fs.S === 0 && hasSensoryFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnSensoryFSZero
    });
  }

  if (fs.S >= 5 && sensory.vibSeverity !== 'absent' && sensory.ptSeverity !== 'absent' && sensory.jpSeverity !== 'absent') {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnSensoryFSHigh
    });
  }

  // ========================================
  // 4. Bowel/Bladder: Check FS vs findings
  // ========================================
  const hasBBFindings = bb.lossBladderFunction || bb.lossBowelFunction ||
                         bb.permanentCatheter || bb.bowelIncontinenceWeekly ||
                         bb.frequentIncontinence || bb.intermittentCatheterization ||
                         bb.rareIncontinence || bb.moderateUrge || bb.mildUrge ||
                         bb.severeConstipation || bb.moderateConstipation || bb.mildConstipation;

  if (fs.BB === 0 && hasBBFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnBBFSZero
    });
  }

  // ========================================
  // 5. Mental: Check FS vs findings
  // ========================================
  const hasMentalFindings = mental.pronouncedDementia || mental.markedlyReducedCognition ||
                             mental.moderatelyReducedCognition || mental.lightlyReducedCognition ||
                             mental.moderateSevereFatigue || mental.mildFatigue;

  if (fs.M === 0 && hasMentalFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnMentalFSZero
    });
  }

  // ========================================
  // 6. Brainstem: Check FS vs findings
  // ========================================
  const hasBrainstemFindings = brainstem.eyeMotilityLevel > 0 ||
                                brainstem.nystagmusLevel > 0 ||
                                brainstem.facialSensibilityLevel > 0 ||
                                brainstem.facialSymmetryLevel > 0 ||
                                brainstem.hearingLevel > 0 ||
                                brainstem.dysarthriaLevel > 0 ||
                                brainstem.dysphagiaLevel > 0;

  if (fs.BS === 0 && hasBrainstemFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnBrainstemFSZero
    });
  }

  // ========================================
  // 7. Visual: Check FS vs findings
  // ========================================
  const hasVisualFindings = visual.leftEyeAcuity !== "1.0" ||
                             visual.rightEyeAcuity !== "1.0" ||
                             visual.visualFieldDeficit !== 'none';

  if (fs.V === 0 && hasVisualFindings) {
    warnings.push({
      type: 'warning',
      category: 'fs-mismatch',
      message: t.warnVisualFSZero
    });
  }

  // ========================================
  // 8. Ambulation vs FS scores
  // ========================================
  if (assistance !== "none" && fs.P === 0 && fs.C === 0) {
    warnings.push({
      type: 'warning',
      category: 'unusual-combination',
      message: t.warnAmbulationUnusual
    });
  }

  if (assistance === "none" && distance !== null && distance >= 500 && (fs.P >= 5 || fs.C >= 5)) {
    warnings.push({
      type: 'warning',
      category: 'unusual-combination',
      message: t.warnWalksButSevereFS
    });
  }

  // ========================================
  // 9. EDSS-FS discordance
  // ========================================
  const maxFS = Math.max(...Object.values(fs));
  if (edss < 4.0 && maxFS >= 5) {
    warnings.push({
      type: 'info',
      category: 'discordance',
      message: t.infoEDSSLowFSHigh.replace('{edss}', edss.toFixed(1)).replace('{maxFS}', maxFS.toString())
    });
  }

  if (edss >= 6.0 && maxFS <= 2) {
    warnings.push({
      type: 'info',
      category: 'discordance',
      message: t.infoEDSSHighFSLow.replace('{edss}', edss.toFixed(1))
    });
  }

  // ========================================
  // 10. Helpful suggestions
  // ========================================
  if (assistance === "none" && distance === null && edss < 4.5) {
    warnings.push({
      type: 'info',
      category: 'suggestion',
      message: t.suggestionDocumentDistance
    });
  }

  return warnings;
}
