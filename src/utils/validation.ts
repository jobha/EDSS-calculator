// ============================================================================
// VALIDATION & WARNINGS
// ============================================================================

import type { PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm, BrainstemForm, VisualForm } from "../types/forms";
import type { Translations } from "../i18n/translations";
import type { AmbulationResult } from "./edss";
import { pyramidalLimbs } from "./scoring";

export type ValidationWarning = {
  type: 'warning' | 'info';
  category: 'fs-mismatch' | 'unusual-combination' | 'discordance' | 'suggestion';
  message: string;
};

type ValidationInput = {
  fs: Record<string, number>;
  ambulation: AmbulationResult | null;
  distance: number | null;
  pyramidal: PyramidalForm;
  cerebellar: CerebellarForm;
  sensory: SensoryForm;
  bb: BowelBladderForm;
  mental: MentalForm;
  brainstem: BrainstemForm;
  visual: VisualForm;
  edss: number;
};

export function validateEDSSInputs(input: ValidationInput, t: Translations): ValidationWarning[] {
  const { fs, ambulation, distance, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, edss } = input;
  const warnings: ValidationWarning[] = [];
  const warn = (message: string, category: ValidationWarning['category'] = 'fs-mismatch') =>
    warnings.push({ type: 'warning', category, message });
  const info = (message: string, category: ValidationWarning['category']) =>
    warnings.push({ type: 'info', category, message });

  // 1. Pyramidal
  const muscles = Object.values(pyramidalLimbs(pyramidal)).flat();
  const hasWeakness = muscles.some((v) => v < 5);
  const hasPyramidalSigns = pyramidal.hyperreflexiaLeft || pyramidal.hyperreflexiaRight ||
    pyramidal.babinskiLeft || pyramidal.babinskiRight || pyramidal.clonusLeft || pyramidal.clonusRight ||
    pyramidal.spasticGait || pyramidal.fatigability;
  if (fs.P === 0 && (hasWeakness || hasPyramidalSigns)) warn(t.warnPyramidalFSZero);
  if (fs.P >= 5 && !muscles.some((v) => v <= 2)) warn(t.warnPyramidalFSHigh);
  if (fs.P === 6 && muscles.some((v) => v > 1)) warn(t.warnPyramidalFS6);

  // 2. Cerebellar
  const limbAtaxia = [cerebellar.limbAtaxiaRightArm, cerebellar.limbAtaxiaLeftArm, cerebellar.limbAtaxiaRightLeg, cerebellar.limbAtaxiaLeftLeg];
  const hasCerebellarFindings = cerebellar.inabilityCoordinatedMovements || [
    ...limbAtaxia, cerebellar.headTremor, cerebellar.truncalAtaxia, cerebellar.tandemWalking,
    cerebellar.gaitAtaxia, cerebellar.romberg, cerebellar.otherCerebellar,
  ].some((v) => v > 0);
  if (fs.C === 0 && hasCerebellarFindings) warn(t.warnCerebellarFSZero);
  const severeAtaxia = Math.max(cerebellar.gaitAtaxia, cerebellar.truncalAtaxia) >= 4 && limbAtaxia.filter((v) => v >= 4).length >= 3;
  if (fs.C >= 4 && !severeAtaxia && !cerebellar.inabilityCoordinatedMovements) warn(t.warnCerebellarFSHigh);

  // 3. Sensory
  const modalities = [
    [sensory.vibSeverity, sensory.vibCount],
    [sensory.ptSeverity, sensory.ptCount],
    [sensory.jpSeverity, sensory.jpCount],
  ] as const;
  if (fs.S === 0 && modalities.some(([sev, count]) => sev !== 'normal' && count > 0)) warn(t.warnSensoryFSZero);
  if (modalities.some(([sev, count]) => sev !== 'normal' && count === 0)) warn(t.warnSensoryNoLimbs, 'suggestion');
  const essentialLoss = sensory.ptCount > 0 && (sensory.ptSeverity === 'absent' || (sensory.ptSeverity === 'marked' && sensory.ptCount > 2));
  if (fs.S >= 5 && !essentialLoss) warn(t.warnSensoryFSHigh);

  // 4. Bowel/Bladder
  const hasBBFindings = bb.urinaryHesitancy > 0 || bb.urinaryUrgency > 0 || bb.bowelDysfunction > 0 || bb.catheterisation !== "none";
  if (fs.BB === 0 && hasBBFindings) warn(t.warnBBFSZero);

  // 5. Cerebral
  const hasMentalFindings = mental.pronouncedDementia || mental.markedlyReducedCognition ||
    mental.moderatelyReducedCognition || mental.lightlyReducedCognition || mental.signsOnlyCognition ||
    mental.moderateToSevereFatigue || mental.mildFatigue;
  if (fs.M === 0 && hasMentalFindings) warn(t.warnMentalFSZero);

  // 6. Brainstem
  const hasBrainstemFindings = brainstem.ino || brainstem.nystagmus !== "none" || [
    brainstem.eyeMotilityLevel, brainstem.facialSensLeft, brainstem.facialSensRight,
    brainstem.facialSymLeft, brainstem.facialSymRight, brainstem.hearingLeft, brainstem.hearingRight,
    brainstem.dysarthriaLevel, brainstem.dysphagiaLevel, brainstem.otherCranialNerves,
  ].some((v) => v > 0);
  if (fs.BS === 0 && hasBrainstemFindings) warn(t.warnBrainstemFSZero);

  // 7. Visual
  const hasVisualFindings = visual.leftEyeAcuity !== "1.0" || visual.rightEyeAcuity !== "1.0" ||
    visual.visualFieldDeficit !== 'none' || visual.scotoma > 0 || visual.discPallor;
  if (fs.V === 0 && hasVisualFindings) warn(t.warnVisualFSZero);

  // 8. Ambulation vs FS scores
  // Neurostatus: if ambulation is restricted, the pyramidal or cerebellar FS must be ≥2
  if (ambulation && ambulation.score >= 1 && fs.P < 2 && fs.C < 2) warn(t.warnAmbulationRestrictedPC, 'unusual-combination');
  const fullyAmbulatory = (ambulation?.score ?? 0) <= 1 && distance !== null && distance >= 500;
  if (fullyAmbulatory && (fs.P >= 5 || fs.C >= 5)) warn(t.warnWalksButSevereFS, 'unusual-combination');

  // 9. EDSS-FS discordance
  const maxFS = Math.max(...Object.values(fs));
  if (edss < 4.0 && maxFS >= 5) {
    info(t.infoEDSSLowFSHigh.replace('{edss}', edss.toFixed(1)).replace('{maxFS}', maxFS.toString()), 'discordance');
  }
  if (edss >= 6.0 && maxFS <= 2) {
    info(t.infoEDSSHighFSLow.replace('{edss}', edss.toFixed(1)), 'discordance');
  }

  // 10. Helpful suggestions
  if (!ambulation && distance === null && edss < 4.5) info(t.suggestionDocumentDistance, 'suggestion');

  return warnings;
}
