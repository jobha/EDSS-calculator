// ============================================================================
// FUNCTIONAL SYSTEM SCORING FUNCTIONS
// Neurostatus definitions (version 04/10.2) and visual scoring table (04/10.3)
// ============================================================================

import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm } from "../types/forms";
import type { EyeAcuity, Severity } from "../types/edss";

// Grade implied by the acuity of a single eye (as the worse eye)
const ACUITY_GRADE: Record<EyeAcuity, number> = {
  "1.0": 0,
  "0.68-0.99": 1,
  "0.34-0.67": 2,
  "0.21-0.33": 3,
  "0.10-0.20": 4,
  "lt_0.10": 5,
};

// Visual functional system scoring
export function suggestV(fs: VisualForm): number {
  const left = ACUITY_GRADE[fs.leftEyeAcuity];
  const right = ACUITY_GRADE[fs.rightEyeAcuity];
  const worseEye = Math.max(left, right);
  const betterEyeAtMost033 = Math.min(left, right) >= 3;

  const fieldGrade = { none: 0, mild: 1, moderate: 3, marked: 4 }[fs.visualFieldDeficit];
  const scotomaGrade = [0, 1, 3][fs.scotoma];
  const pallorGrade = fs.discPallor ? 1 : 0;

  const grade = Math.max(worseEye, fieldGrade, scotomaGrade, pallorGrade);
  // Grades 4–6: grade 3/4/5 plus maximal acuity of the better eye of 0.33 or less
  if (grade >= 3 && betterEyeAtMost033) return Math.min(grade + 1, 6);
  return grade;
}

// Brainstem functional system scoring
export function suggestBS(fs: BrainstemForm): number {
  // EOM: moderate impairment → FS 2, marked impairment → FS 3
  const eomGrade = [0, 1, 2, 2, 3][fs.eyeMotilityLevel];
  // Nystagmus: moderate → FS 2, severe → FS 3
  const nystagmusGrade = { none: 0, mild: 1, clear: 2, spontaneous: 3 }[fs.nystagmus];
  const inoGrade = fs.ino ? 1 : 0;

  // Other items: mild → 2, moderate → 3, marked → 4; inability to speak/swallow → 5
  return Math.max(
    eomGrade,
    nystagmusGrade,
    inoGrade,
    fs.facialSensLeft, fs.facialSensRight,
    fs.facialSymLeft, fs.facialSymRight,
    fs.hearingLeft, fs.hearingRight,
    fs.dysarthriaLevel,
    fs.dysphagiaLevel,
    fs.otherCranialNerves,
  );
}

export function pyramidalLimbs(fs: PyramidalForm) {
  return {
    rightArm: [fs.shoulderAbductionR, fs.shoulderExternalRotationR, fs.elbowFlexionR, fs.elbowExtensionR, fs.wristExtensionR, fs.fingerAbductionR],
    leftArm: [fs.shoulderAbductionL, fs.shoulderExternalRotationL, fs.elbowFlexionL, fs.elbowExtensionL, fs.wristExtensionL, fs.fingerAbductionL],
    rightLeg: [fs.hipFlexionR, fs.hipAbductionR, fs.kneeExtensionR, fs.kneeFlexionR, fs.ankleDorsiflexionR, fs.anklePlantarflexionR],
    leftLeg: [fs.hipFlexionL, fs.hipAbductionL, fs.kneeExtensionL, fs.kneeFlexionL, fs.ankleDorsiflexionL, fs.anklePlantarflexionL],
  };
}

// Pyramidal functional system scoring
// Grades 2–3 are defined per muscle group, grades 4–6 per limb (weakest muscle group of the limb).
export function suggestP(fs: PyramidalForm): number {
  const limbs = pyramidalLimbs(fs);
  const all = Object.values(limbs).flat();
  const plegic = (limb: number[]) => limb.every((v) => v <= 1);
  const limbMins = Object.values(limbs).map((limb) => Math.min(...limb));
  const limbsAtMost = (grade: number) => limbMins.filter((m) => m <= grade).length;

  // 6: tetraplegia (BMRC 0–1 in all muscle groups of upper and lower limbs)
  if (all.every((v) => v <= 1)) return 6;

  // 5: paraplegia, marked tetraparesis (≤2 in three or more limbs) or hemiplegia
  const paraplegia = plegic(limbs.rightLeg) && plegic(limbs.leftLeg);
  const hemiplegia = (plegic(limbs.rightArm) && plegic(limbs.rightLeg)) || (plegic(limbs.leftArm) && plegic(limbs.leftLeg));
  if (paraplegia || hemiplegia || limbsAtMost(2) >= 3) return 5;

  // 4: marked para-/hemiparesis (≤2 in two limbs), monoplegia (0–1 in one limb)
  //    or moderate tetraparesis (grade 3 in three or more limbs)
  const monoplegia = Object.values(limbs).some(plegic);
  if (limbsAtMost(2) >= 2 || monoplegia || limbsAtMost(3) >= 3) return 4;

  // 3: grade 4 in more than two muscle groups, grade 3 in one or two muscle groups,
  //    or severe monoparesis (≤2 in one muscle group)
  const grade4Count = all.filter((v) => v === 4).length;
  if (grade4Count > 2 || all.some((v) => v <= 3)) return 3;

  // 2: grade 4 in one or two muscle groups, or motor fatigability / reduced performance
  if (grade4Count > 0 || fs.fatigability || fs.spasticGait) return 2;

  // 1: abnormal signs without disability
  const hasUMNSigns = fs.hyperreflexiaLeft || fs.hyperreflexiaRight || fs.babinskiLeft || fs.babinskiRight || fs.clonusLeft || fs.clonusRight;
  if (hasUMNSigns) return 1;

  return 0;
}

// Cerebellar functional system scoring
export function suggestC(fs: CerebellarForm): number {
  const limbs = [fs.limbAtaxiaRightArm, fs.limbAtaxiaLeftArm, fs.limbAtaxiaRightLeg, fs.limbAtaxiaLeftLeg];
  const maxLimb = Math.max(...limbs);
  const severeLimbs = limbs.filter((v) => v >= 4).length;
  const gaitOrTrunk = Math.max(fs.gaitAtaxia, fs.truncalAtaxia);

  // 5: unable to perform coordinated movements due to ataxia
  if (fs.inabilityCoordinatedMovements) return 5;
  // 4: severe gait/truncal ataxia AND severe ataxia in three or four limbs
  if (gaitOrTrunk >= 4 && severeLimbs >= 3) return 4;
  // 3: moderate limb ataxia and/or moderate or severe gait/truncal ataxia
  //    (severe gait/truncal ataxia alone results in FS 3)
  if (maxLimb >= 3 || gaitOrTrunk >= 3) return 3;
  // 2: mild ataxia, moderate station ataxia (Romberg) and/or tandem walking not possible
  if (maxLimb >= 2 || gaitOrTrunk >= 2 || fs.romberg >= 2 || fs.tandemWalking >= 2 ||
      fs.headTremor >= 2 || fs.otherCerebellar >= 2) return 2;
  // 1: abnormal signs without disability
  if (maxLimb >= 1 || gaitOrTrunk >= 1 || fs.romberg >= 1 || fs.tandemWalking >= 1 ||
      fs.headTremor >= 1 || fs.otherCerebellar >= 1) return 1;
  return 0;
}

// Neurostatus subscore for each sensory modality
const SUPERFICIAL_LEVEL: Record<Severity, number> = { normal: 0, signs: 1, mild: 2, moderate: 3, marked: 4, absent: 5 };
// Vibration and position sense: 1 mild, 2 moderate, 3 marked (complete loss)
const PROPRIOCEPTIVE_LEVEL: Record<Severity, number> = { normal: 0, signs: 1, mild: 1, moderate: 2, marked: 3, absent: 3 };

// Sensory functional system scoring
export function suggestS(fs: SensoryForm): number {
  const vib = fs.vibCount > 0 ? PROPRIOCEPTIVE_LEVEL[fs.vibSeverity] : 0;
  const pos = fs.jpCount > 0 ? PROPRIOCEPTIVE_LEVEL[fs.jpSeverity] : 0;
  const sup = fs.ptCount > 0 ? SUPERFICIAL_LEVEL[fs.ptSeverity] : 0;

  // 6: sensation essentially lost below the head
  if (sup === 5 && fs.ptCount === 4 && vib === 3 && fs.vibCount === 4 && pos === 3 && fs.jpCount === 4) return 6;

  // Index = subscore; [one or two limbs, more than two limbs]
  const vibrationGrade = [[0, 0], [1, 2], [2, 2], [3, 4]][vib][fs.vibCount > 2 ? 1 : 0];
  const positionGrade = [[0, 0], [2, 2], [3, 3], [3, 4]][pos][fs.jpCount > 2 ? 1 : 0];
  const superficialGrade = [[0, 0], [1, 2], [2, 3], [3, 4], [4, 5], [5, 5]][sup][fs.ptCount > 2 ? 1 : 0];

  return Math.max(vibrationGrade, positionGrade, superficialGrade);
}

// Bowel/bladder functional system scoring
export function suggestBB(fs: BowelBladderForm): number {
  const lossBladder = fs.urinaryHesitancy === 4 || fs.urinaryUrgency === 4;
  const lossBowel = fs.bowelDysfunction === 4;
  const items = [fs.urinaryHesitancy, fs.urinaryUrgency, fs.bowelDysfunction];

  // 6: loss of bowel and bladder function
  if (lossBladder && lossBowel) return 6;
  // 5: loss of bladder or bowel function; external or indwelling catheter
  if (lossBladder || lossBowel || fs.catheterisation === "indwelling") return 5;
  // 4: in need of almost constant catheterisation
  if (fs.catheterisation === "almostConstant") return 4;
  // 3: frequent urinary incontinence or intermittent self-catheterisation; enemata or manual evacuation
  if (fs.catheterisation === "intermittent" || items.some((v) => v >= 3)) return 3;
  // 2: moderate hesitancy/retention, urgency/incontinence or bowel dysfunction
  if (items.some((v) => v >= 2)) return 2;
  // 1: mild hesitancy, urgency and/or constipation
  if (items.some((v) => v >= 1)) return 1;
  return 0;
}

// Cerebral functional system scoring (depression and euphoria are not considered)
export function suggestM(fs: MentalForm): number {
  if (fs.pronouncedDementia) return 5;
  if (fs.markedlyReducedCognition) return 4;
  if (fs.moderatelyReducedCognition) return 3;
  // 2: mild decrease in mentation; moderate or severe fatigue
  if (fs.moderateToSevereFatigue || fs.lightlyReducedCognition) return 2;
  // 1: signs only in decrease in mentation; mild fatigue
  if (fs.mildFatigue || fs.signsOnlyCognition) return 1;
  return 0;
}
