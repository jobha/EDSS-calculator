import React, { useEffect, useMemo, useState } from "react";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const fsMeta: Record<string, { label: string; max: number; help: string }> = {
  V: { label: "V (Visual)", max: 6, help: "Acuity/scotoma; 0-6" },
  BS: { label: "BS (Brainstem)", max: 5, help: "INO, dysarthria, nystagmus; 0-5" },
  P: { label: "P (Pyramidal)", max: 6, help: "MRC strength + UMN/gait; 0-6" },
  C: { label: "C (Cerebellar)", max: 5, help: "FNF/HKS, DDK, truncal; 0-5" },
  S: { label: "S (Sensory)", max: 6, help: "Pinprick, vibration, proprioception; 0-6" },
  BB: { label: "BB (Bowel/Bladder)", max: 6, help: "Urgency, incontinence, catheter; 0-6" },
  M: { label: "M (Cerebral)", max: 5, help: "Cognition/mood; 0-5" },
};

const assistanceLevels = [
  { id: "none", label: "No assistance required" },
  { id: "uni_50_plus", label: "Unilateral aid (cane/crutch), walks ≥50 m" },
  { id: "uni_under_50", label: "Unilateral aid (cane/crutch), walks <50 m" },
  { id: "bi_120_plus", label: "Bilateral aid (two canes/crutches/walker), walks ≥120 m" },
  { id: "bi_5_to_120", label: "Bilateral aid, walks ≥5 m but <120 m" },
  { id: "bi_under_5", label: "Bilateral aid, walks <5 m" },
  { id: "wheel_self", label: "Wheelchair; self-propels and transfers independently" },
  { id: "wheel_some_help", label: "Wheelchair; needs some help with transfers, self-propels" },
  { id: "wheel_dependent", label: "Wheelchair; completely dependent for transfers and propulsion" },
  { id: "bed_chair_arms_ok", label: "Bed/chair; arms effective; mostly self-care" },
  { id: "bed_chair_limited_arms", label: "Bed-bound; limited arm use; some self-care" },
  { id: "helpless", label: "Helpless; cannot communicate/eat effectively" },
  { id: "total_care", label: "Totally helpless; total care incl. feeding" },
] as const;

type AssistanceId = typeof assistanceLevels[number]["id"];

// Utility functions
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function roundToHalf(x: number) {
  return Math.round(x * 2) / 2;
}
function ceilToHalf(x: number) {
  return Math.ceil(x * 2) / 2;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type EyeAcuity = "1.0" | "0.68-0.99" | "0.34-0.67" | "0.21-0.33" | "0.10-0.20" | "lt_0.10";

type VisualForm = {
  leftEyeAcuity: EyeAcuity;
  rightEyeAcuity: EyeAcuity;
  visualFieldDeficit: "none" | "mild" | "moderate" | "marked";
};

type BrainstemForm = {
  eyeMotilityLevel: 0 | 1 | 2 | 3 | 4;
  nystagmusLevel: 0 | 1 | 2 | 3;
  facialSensibilityLevel: 0 | 1 | 2 | 3 | 4;
  facialSymmetryLevel: 0 | 1 | 2 | 3 | 4;
  hearingLevel: 0 | 1 | 2 | 3 | 4;
  dysarthriaLevel: 0 | 1 | 2 | 3 | 4;
  dysphagiaLevel: 0 | 1 | 2 | 3 | 4;
};

type PyramidalForm = {
  // Upper limb MRC scores
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
  // Lower limb MRC scores
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
  hyperreflexia: boolean;
  babinski: boolean;
  clonus: boolean;
  spasticGait: boolean;
  fatigability: boolean;
};

type CerebellarForm = {
  tremorOrAtaxiaOnCoordTests: boolean;
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

export type Severity = 'normal' | 'mild' | 'moderate' | 'marked' | 'absent';

type SensoryForm = {
  vibSeverity: Severity;
  vibCount: number;
  ptSeverity: Severity;
  ptCount: number;
  jpSeverity: Severity;
  jpCount: number;
};

type BowelBladderForm = {
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

type MentalForm = {
  // Fatigue
  mildFatigue: boolean;
  moderateToSevereFatigue: boolean;
  // Cognition
  lightlyReducedCognition: boolean;
  moderatelyReducedCognition: boolean;
  markedlyReducedCognition: boolean;
  pronouncedDementia: boolean;
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

// Visual scoring helpers
function acuityToNumeric(acuity: EyeAcuity): number {
  const map: Record<EyeAcuity, number> = {
    "1.0": 1.0,
    "0.68-0.99": 0.835,
    "0.34-0.67": 0.505,
    "0.21-0.33": 0.27,
    "0.10-0.20": 0.15,
    "lt_0.10": 0.05,
  };
  return map[acuity];
}
function formatEyeAcuity(acuity: EyeAcuity): string {
  const map: Record<EyeAcuity, string> = {
    "1.0": "1.0",
    "0.68-0.99": "0.68-0.99",
    "0.34-0.67": "0.34-0.67",
    "0.21-0.33": "0.21-0.33",
    "0.10-0.20": "0.10-0.20",
    "lt_0.10": "<0.10",
  };
  return map[acuity];
}

// Visual functional system scoring (Norwegian EDSS guidelines)
function suggestV(fs: VisualForm): number {
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
function suggestBS(fs: BrainstemForm): number {
  const maxLevel = Math.max(
    fs.eyeMotilityLevel,
    fs.nystagmusLevel,
    fs.facialSensibilityLevel,
    fs.facialSymmetryLevel,
    fs.hearingLevel,
    fs.dysarthriaLevel,
    fs.dysphagiaLevel
  );

  // FS 5: Unable to swallow or speak
  if (fs.dysphagiaLevel === 4 || fs.dysarthriaLevel === 4) return 5;

  // FS 4: Marked dysarthria or other marked deficits
  if (fs.dysarthriaLevel >= 3 || maxLevel === 4) return 4;

  // FS 3: Severe nystagmus, marked eye muscle paresis, or moderate deficits in other cranial nerves
  if (fs.nystagmusLevel === 3 || fs.eyeMotilityLevel === 3 || maxLevel === 3) return 3;

  // FS 2: Moderate nystagmus or other mild deficits
  if (fs.nystagmusLevel === 2 || maxLevel === 2) return 2;

  // FS 1: Abnormal findings on clinical examination without symptoms or functional loss
  if (maxLevel === 1) return 1;

  return 0;
}

function suggestP(fs: PyramidalForm): number {
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
  if (minStrength===5 && !(fs.hyperreflexia||fs.babinski||fs.clonus||fs.spasticGait||fs.fatigability)) return 0;
  // 1: UMN signs only
  if (minStrength===5 && (fs.hyperreflexia||fs.babinski||fs.clonus) && !fs.spasticGait && !fs.fatigability) return 1;
  // 2: minimal weakness or fatigability
  if (minStrength===4 && countEq(4)<=2 && !fs.spasticGait) return 2;
  if (fs.fatigability && minStrength>=4 && !fs.spasticGait) return 2;
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

function suggestC(fs: CerebellarForm): number {
  // Standalone high grades
  if (fs.inabilityCoordinatedMovements) return 5;
  if (fs.ataxiaThreeOrFourLimbs) return 4;
  if (fs.needsAssistanceDueAtaxia) return 4;
  // Moderate impact
  if (fs.limbAtaxiaAffectsFunction || fs.gaitAtaxia || fs.truncalAtaxiaEO) return 3;
  // Mild objective signs
  if (fs.tremorOrAtaxiaOnCoordTests || fs.rombergFallTendency || fs.lineWalkDifficulty) return 2;
  // Minimal symptoms only
  if (fs.mildCerebellarSignsNoFunction) return 1;
  return 0;
}

function suggestS(fs: SensoryForm): number {
  const sevRank = { normal: 0, mild: 1, moderate: 2, marked: 3, absent: 4 } as const;
  const sV = sevRank[fs.vibSeverity];
  const sP = sevRank[fs.ptSeverity];
  const sJ = sevRank[fs.jpSeverity];
  const cV = fs.vibCount|0; const cP = fs.ptCount|0; const cJ = fs.jpCount|0;

  // If all modalities normal or counts zero → 0
  if ((sV===0||cV===0) && (sP===0||cP===0) && (sJ===0||cJ===0)) return 0;

  // Global rule: all three modalities absent → 6
  if (sV===4 && cV>0 && sP===4 && cP>0 && sJ===4 && cJ>0) return 6;

  // Per-modality scoring following Norwegian EDSS guidelines
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

  // Hierarchy floors from Norwegian guidelines:
  // - Any joint position affected → FS ≥2
  if (sJ>0 && cJ>0) score = Math.max(score, 2);
  // - Any modality affecting ≥3 limbs → FS ≥2
  if ((sV>0 && cV>=3) || (sP>0 && cP>=3) || (sJ>0 && cJ>=3)) score = Math.max(score, 2);

  return score;
}

function suggestBB(fs: BowelBladderForm): number {
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

function suggestM(fs: MentalForm): number {
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

// ============================================================================
// EDSS CALCULATION
// ============================================================================

function convertVisualForEDSS(v: number): number {
  if (v >= 6) return 4; if (v === 5 || v === 4) return 3; if (v === 3 || v === 2) return 2; if (v === 1) return 1; return 0;
}
function convertBBForEDSS(bb: number): number {
  // Corrected FS scores according to Norwegian guidelines
  if (bb === 6) return 5; // Loss of bladder AND bowel → 5
  if (bb === 5) return 4; // Loss of bladder OR bowel → 4
  if (bb === 4) return 3; // Permanent catheter OR weekly bowel incontinence → 3
  if (bb === 3) return 2; // Frequent incontinence OR intermittent catheterization → 2
  if (bb === 2) return 2; // Moderate urge/constipation OR rare incontinence → 2
  if (bb === 1) return 1; // Mild urge or constipation → 1
  return 0;
}
function correctedFS(fs: Record<string, number>): Record<string, number> {
  const out = { ...fs } as Record<string, number>;
  out.V = convertVisualForEDSS(fs.V);
  out.BB = convertBBForEDSS(fs.BB);
  return out;
}

function computeLowEDSS_Neurostatus(fs: Record<string, number>) {
  const v = Object.values(fs);
  const cnt = (n: number) => v.filter((x) => x === n).length;
  const max = Math.max(...v);
  const noneAbove = (n: number) => v.every((x) => x <= n);
  const rules = [
    { when: () => v.every((x) => x === 0), out: { edss: 0.0, rationale: "All FS = 0" } },
    { when: () => cnt(1) === 1 && noneAbove(1), out: { edss: 1.0, rationale: "Single FS = 1; others 0" } },
    { when: () => cnt(1) >= 2 && noneAbove(1), out: { edss: 1.5, rationale: ">=2 FS = 1; others 0" } },
    { when: () => cnt(2) === 1 && noneAbove(2), out: { edss: 2.0, rationale: "Single FS = 2; others <=1" } },
    { when: () => cnt(2) === 2 && noneAbove(2), out: { edss: 2.5, rationale: "Two FS = 2; others <=1" } },
    { when: () => cnt(2) >= 3 && noneAbove(2), out: { edss: 3.0, rationale: "Three or four FS = 2; others <=1" } },
    { when: () => cnt(3) === 1 && cnt(2) >= 1 && noneAbove(3), out: { edss: 3.5, rationale: "One FS = 3 plus others = 2" } },
    { when: () => cnt(3) === 1 && v.filter((x) => x !== 3).every((x) => x <= 2), out: { edss: 3.0, rationale: "Single FS = 3; others <=2" } },
    { when: () => cnt(3) >= 2 && noneAbove(3), out: { edss: 3.5, rationale: "Two FS = 3" } },
  ] as const;
  for (const r of rules) if (r.when()) return r.out as { edss: number; rationale: string };
  if (max <= 3) return { edss: 3.5, rationale: "FS pattern consistent with <=3.5" } as const;
  return null;
}

function computeAmbulationEDSS(assistance: AssistanceId, distanceNoAid: number | null) {
  // Handle walking with aids
  switch (assistance) {
    case "uni_50_plus":
      // 6.0: ≥50m with unilateral aid OR <100m without aid
      return { edss: 6.0, rationale: "Walks ≥50 m with unilateral aid" } as const;
    case "uni_under_50":
      // 6.5: <50m with unilateral aid
      return { edss: 6.5, rationale: "Walks <50 m with unilateral aid" } as const;
    case "bi_120_plus":
      // 6.0: ≥120m with bilateral aid
      return { edss: 6.0, rationale: "Walks ≥120 m with bilateral aid" } as const;
    case "bi_5_to_120":
      // 6.5: ≥5m but <120m with bilateral aid
      return { edss: 6.5, rationale: "Walks ≥5 m but <120 m with bilateral aid" } as const;
    case "bi_under_5":
      // 7.0: <5m with bilateral aid
      return { edss: 7.0, rationale: "Walks <5 m with bilateral aid" } as const;
    case "wheel_self":
      // 7.0: Self-propels wheelchair, transfers independently
      return { edss: 7.0, rationale: "Wheelchair; self-propels and transfers independently" } as const;
    case "wheel_some_help":
      // 7.5: Needs some help with transfers
      return { edss: 7.5, rationale: "Wheelchair; needs help with transfers, self-propels" } as const;
    case "wheel_dependent":
      // 8.0: Completely dependent for wheelchair
      return { edss: 8.0, rationale: "Wheelchair; completely dependent" } as const;
    case "bed_chair_arms_ok":
      return { edss: 8.0, rationale: "Bed/chair; arms effective" } as const;
    case "bed_chair_limited_arms":
      return { edss: 8.5, rationale: "Bed-bound; limited arm use" } as const;
    case "helpless":
      return { edss: 9.0, rationale: "Helpless bedridden" } as const;
    case "total_care":
      return { edss: 9.5, rationale: "Totally helpless; total care" } as const;
  }

  // Handle walking without aids
  if (assistance === "none" && distanceNoAid != null) {
    // No upper limit mentioned - unlimited walking = can be 0-4.5 based on FS
    if (distanceNoAid >= 500) return null; // Will be determined by FS score
    if (distanceNoAid >= 300) return { edss: 4.5, rationale: "Walks 300-499 m unaided" } as const;
    if (distanceNoAid >= 200) return { edss: 5.0, rationale: "Walks 200-299 m unaided" } as const;
    if (distanceNoAid >= 100) return { edss: 5.5, rationale: "Walks 100-199 m unaided" } as const;
    // <100m without aid = 6.0
    return { edss: 6.0, rationale: "Walks <100 m unaided" } as const;
  }
  return null;
}

function computeEDSSFromInputs(fs: Record<string, number>, assistance: AssistanceId, distanceNoAid: number | null) {
  // Use corrected FS scores for EDSS calculation
  const correctedFSValues = correctedFS(fs);
  const low = computeLowEDSS_Neurostatus(correctedFSValues);

  if (assistance !== "none") {
    const ambAid = computeAmbulationEDSS(assistance, distanceNoAid);
    const base = ambAid ?? (low ?? { edss: 4.0, rationale: "Default 4.0" } as const);
    const maxFS = Math.max(...Object.values(correctedFSValues));
    return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
  }
  if (distanceNoAid == null) {
    const base = low ?? ({ edss: 4.0, rationale: "Default 4.0" } as const);
    const maxFS = Math.max(...Object.values(correctedFSValues));
    return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
  }
  let base: { edss: number; rationale: string } | null = null;
  if (distanceNoAid >= 500) base = low ?? { edss: 4.0, rationale: "Walks >=500 m unaided" } as const;
  else base = computeAmbulationEDSS(assistance, distanceNoAid) ?? (low ?? { edss: 4.5, rationale: "Distance <500 m" } as const);
  const maxFS = Math.max(...Object.values(correctedFSValues));
  return { edss: Math.max(base.edss, ceilToHalf(maxFS)), rationale: base.rationale + "; guarded by FS" } as const;
}

// ---------- Component ----------
export default function App() {
  const [assistance, setAssistance] = useState<AssistanceId>("none");
  const [distance, setDistance] = useState<string>("500");

  const [fs, setFs] = useState<Record<string, number>>({ V: 0, BS: 0, P: 0, C: 0, S: 0, BB: 0, M: 0 });

  const [visual, setVisual] = useState<VisualForm>({
    leftEyeAcuity: "1.0",
    rightEyeAcuity: "1.0",
    visualFieldDeficit: "none",
  });
  const [brainstem, setBrainstem] = useState<BrainstemForm>({
    eyeMotilityLevel: 0,
    nystagmusLevel: 0,
    facialSensibilityLevel: 0,
    facialSymmetryLevel: 0,
    hearingLevel: 0,
    dysarthriaLevel: 0,
    dysphagiaLevel: 0,
  });
  const [pyramidal, setPyramidal] = useState<PyramidalForm>({
    // Upper
    shoulderAbductionR:5, shoulderAbductionL:5,
    shoulderExternalRotationR:5, shoulderExternalRotationL:5,
    elbowFlexionR:5, elbowFlexionL:5,
    elbowExtensionR:5, elbowExtensionL:5,
    wristExtensionR:5, wristExtensionL:5,
    fingerAbductionR:5, fingerAbductionL:5,
    // Lower
    hipFlexionR:5, hipFlexionL:5,
    hipAbductionR:5, hipAbductionL:5,
    kneeExtensionR:5, kneeExtensionL:5,
    kneeFlexionR:5, kneeFlexionL:5,
    ankleDorsiflexionR:5, ankleDorsiflexionL:5,
    anklePlantarflexionR:5, anklePlantarflexionL:5,
    // Flags
    hyperreflexia:false, babinski:false, clonus:false, spasticGait:false, fatigability:false,
  });
  const [cerebellar, setCerebellar] = useState<CerebellarForm>({
    tremorOrAtaxiaOnCoordTests: false,
    rombergFallTendency: false,
    lineWalkDifficulty: false,
    limbAtaxiaAffectsFunction: false,
    gaitAtaxia: false,
    truncalAtaxiaEO: false,
    needsAssistanceDueAtaxia: false,
    ataxiaThreeOrFourLimbs: false,
    inabilityCoordinatedMovements: false,
    mildCerebellarSignsNoFunction: false,
  });
  const [sensory, setSensory] = useState<SensoryForm>({
    vibSeverity: 'normal', vibCount: 0,
    ptSeverity: 'normal', ptCount: 0,
    jpSeverity: 'normal', jpCount: 0,
  });
  const [bb, setBB] = useState<BowelBladderForm>({
    mildUrge: false,
    mildConstipation: false,
    moderateUrge: false,
    moderateConstipation: false,
    rareIncontinence: false,
    severeConstipation: false,
    frequentIncontinence: false,
    intermittentCatheterization: false,
    needsHelpForBowelMovement: false,
    permanentCatheter: false,
    bowelIncontinenceWeekly: false,
    lossBladderFunction: false,
    lossBowelFunction: false,
  });
  const [mental, setMental] = useState<MentalForm>({
    mildFatigue: false,
    moderateToSevereFatigue: false,
    lightlyReducedCognition: false,
    moderatelyReducedCognition: false,
    markedlyReducedCognition: false,
    pronouncedDementia: false,
  });

  // Auto-suggest numeric FS from checklists (useEffect to avoid scroll jump)
  useEffect(() => { setFs((prev) => ({ ...prev, V: clamp(suggestV(visual), 0, fsMeta.V.max) })); }, [visual]);
  useEffect(() => { setFs((prev) => ({ ...prev, BS: clamp(suggestBS(brainstem), 0, fsMeta.BS.max) })); }, [brainstem]);
  useEffect(() => { setFs((prev) => ({ ...prev, P: clamp(suggestP(pyramidal), 0, fsMeta.P.max) })); }, [pyramidal]);
  useEffect(() => { setFs((prev) => ({ ...prev, C: clamp(suggestC(cerebellar), 0, fsMeta.C.max) })); }, [cerebellar]);
  useEffect(() => { setFs((prev) => ({ ...prev, S: clamp(suggestS(sensory), 0, fsMeta.S.max) })); }, [sensory]);
  useEffect(() => { setFs((prev) => ({ ...prev, BB: clamp(suggestBB(bb), 0, fsMeta.BB.max) })); }, [bb]);
  useEffect(() => { setFs((prev) => ({ ...prev, M: clamp(suggestM(mental), 0, fsMeta.M.max) })); }, [mental]);

  const parsedDistance = useMemo(() => {
    const n = Number(distance);
    return Number.isFinite(n) ? clamp(Math.round(n), 0, 2000) : null;
  }, [distance]);

  const result = useMemo(() => computeEDSSFromInputs(fs, assistance, parsedDistance), [assistance, parsedDistance, fs]);
  const edss = useMemo(() => roundToHalf(result.edss), [result]);

  const countFS = (grade: number) => Object.values(fs).filter((v) => v === grade).length;

  // Corrected FS values for EDSS calculation
  const correctedFSForDisplay = useMemo(() => correctedFS(fs), [fs]);
  const countCorrectedFS = (grade: number) => Object.values(correctedFSForDisplay).filter((v) => v === grade).length;

  // Summary (multi-line, copy-ready)
  const summary = useMemo(() => {
    const ambFinding = assistance === 'none'
      ? (parsedDistance != null ? `unaided ${parsedDistance} m` : 'unaided (n/a)')
      : (assistanceLevels.find(a=>a.id===assistance)?.label ?? String(assistance));

    // Pyramidal summary
    const minMRC = Math.min(
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
    );
    const pFlags = [pyramidal.spasticGait && 'spastic gait', pyramidal.babinski && 'Babinski', pyramidal.fatigability && 'fatigue']
      .filter(Boolean).join(', ');
    const pSummary = pFlags || (minMRC < 5 ? `min MRC ${minMRC}` : 'normal');

    // Visual summary
    const vCorrected = convertVisualForEDSS(fs.V);
    const leftAcuity = formatEyeAcuity(visual.leftEyeAcuity);
    const rightAcuity = formatEyeAcuity(visual.rightEyeAcuity);
    const vfDeficit = visual.visualFieldDeficit !== 'none' ? `, ${visual.visualFieldDeficit} VF deficit` : '';
    const vSummary = `L: ${leftAcuity}, R: ${rightAcuity}${vfDeficit}`;

    // Brainstem summary
    const bsFindings = [
      brainstem.eyeMotilityLevel > 0 && `eye motility ${brainstem.eyeMotilityLevel}`,
      brainstem.nystagmusLevel > 0 && `nystagmus ${brainstem.nystagmusLevel}`,
      brainstem.facialSensibilityLevel > 0 && `facial sens ${brainstem.facialSensibilityLevel}`,
      brainstem.facialSymmetryLevel > 0 && `facial sym ${brainstem.facialSymmetryLevel}`,
      brainstem.hearingLevel > 0 && `hearing ${brainstem.hearingLevel}`,
      brainstem.dysarthriaLevel > 0 && `dysarthria ${brainstem.dysarthriaLevel}`,
      brainstem.dysphagiaLevel > 0 && `dysphagia ${brainstem.dysphagiaLevel}`,
    ].filter(Boolean).join(', ');
    const bsSummary = bsFindings || 'normal';

    // Cerebellar summary
    const cFindings = [
      cerebellar.inabilityCoordinatedMovements && 'unable coordinated movements',
      cerebellar.ataxiaThreeOrFourLimbs && 'ataxia 3-4 limbs',
      cerebellar.needsAssistanceDueAtaxia && 'needs assistance',
      cerebellar.limbAtaxiaAffectsFunction && 'limb ataxia affects function',
      cerebellar.gaitAtaxia && 'gait ataxia',
      cerebellar.truncalAtaxiaEO && 'truncal ataxia',
      cerebellar.tremorOrAtaxiaOnCoordTests && 'tremor/ataxia on testing',
      cerebellar.rombergFallTendency && 'Romberg fall',
      cerebellar.lineWalkDifficulty && 'tandem walk difficulty',
    ].filter(Boolean).join(', ');
    const cSummary = cFindings || 'normal';

    // Sensory summary
    const sFindings = [
      sensory.vibSeverity !== 'normal' && sensory.vibCount > 0 && `vib ${sensory.vibSeverity} ${sensory.vibCount} limbs`,
      sensory.ptSeverity !== 'normal' && sensory.ptCount > 0 && `pain/touch ${sensory.ptSeverity} ${sensory.ptCount} limbs`,
      sensory.jpSeverity !== 'normal' && sensory.jpCount > 0 && `joint pos ${sensory.jpSeverity} ${sensory.jpCount} limbs`,
    ].filter(Boolean).join(', ');
    const sSummary = sFindings || 'normal';

    // Bowel/Bladder summary
    const bbFindings = [
      bb.lossBladderFunction && 'loss bladder function',
      bb.lossBowelFunction && 'loss bowel function',
      bb.permanentCatheter && 'permanent catheter',
      bb.bowelIncontinenceWeekly && 'bowel incontinence weekly',
      bb.frequentIncontinence && 'frequent incontinence',
      bb.intermittentCatheterization && 'intermittent cath',
      bb.needsHelpForBowelMovement && 'needs help for BM',
      bb.moderateUrge && 'moderate urge',
      bb.moderateConstipation && 'moderate constipation',
      bb.rareIncontinence && 'rare incontinence',
      bb.severeConstipation && 'severe constipation',
      bb.mildUrge && 'mild urge',
      bb.mildConstipation && 'mild constipation',
    ].filter(Boolean).join(', ');
    const bbCorrected = convertBBForEDSS(fs.BB);
    const bbSummary = bbFindings || 'normal';

    // Mental summary
    const mFindings = [
      mental.pronouncedDementia && 'pronounced dementia',
      mental.markedlyReducedCognition && 'markedly reduced cognition',
      mental.moderatelyReducedCognition && 'moderately reduced cognition',
      mental.lightlyReducedCognition && 'lightly reduced cognition',
      mental.moderateToSevereFatigue && 'moderate-severe fatigue',
      mental.mildFatigue && 'mild fatigue',
    ].filter(Boolean).join(', ');
    const mSummary = mFindings || 'normal';

    const lines = [
      `EDSS ${edss.toFixed(1)}`,
      `Ambulation ${(computeAmbulationEDSS(assistance, parsedDistance)?.edss ?? edss).toFixed(1)} (${ambFinding})`,
      `P ${fs.P}${pSummary !== 'normal' ? ` (${pSummary})` : ''}`,
      `V ${fs.V}${fs.V !== vCorrected ? ` (corrected: ${vCorrected})` : ''}${vSummary !== 'L: 1.0, R: 1.0' || visual.visualFieldDeficit !== 'none' ? ` (${vSummary})` : ''}`,
      `BS ${fs.BS}${bsSummary !== 'normal' ? ` (${bsSummary})` : ''}`,
      `C ${fs.C}${cSummary !== 'normal' ? ` (${cSummary})` : ''}`,
      `S ${fs.S}${sSummary !== 'normal' ? ` (${sSummary})` : ''}`,
      `BB ${fs.BB}${fs.BB !== bbCorrected ? ` (corrected: ${bbCorrected})` : ''}${bbSummary !== 'normal' ? ` (${bbSummary})` : ''}`,
      `M ${fs.M}${mSummary !== 'normal' ? ` (${mSummary})` : ''}`,
    ];
    return lines.join('\n');
  }, [edss, fs, assistance, parsedDistance, pyramidal, visual, brainstem, cerebellar, sensory, bb, mental]);

  // Full examination text (narrative format with normal findings)
  const examinationText = useMemo(() => {
    const sections: string[] = [];

    // Visual
    const leftAcuity = formatEyeAcuity(visual.leftEyeAcuity);
    const rightAcuity = formatEyeAcuity(visual.rightEyeAcuity);
    let visualText = `Visual acuity: Left eye ${leftAcuity}, right eye ${rightAcuity}.`;
    if (visual.visualFieldDeficit !== 'none') {
      visualText += ` ${visual.visualFieldDeficit.charAt(0).toUpperCase() + visual.visualFieldDeficit.slice(1)} visual field deficit.`;
    } else {
      visualText += ' No visual field deficits.';
    }
    sections.push(visualText);

    // Brainstem
    const bsParts: string[] = [];
    if (brainstem.eyeMotilityLevel > 0) bsParts.push(`eye motility impairment (level ${brainstem.eyeMotilityLevel})`);
    if (brainstem.nystagmusLevel > 0) bsParts.push(`nystagmus (level ${brainstem.nystagmusLevel})`);
    if (brainstem.facialSensibilityLevel > 0) bsParts.push(`facial sensibility deficit (level ${brainstem.facialSensibilityLevel})`);
    if (brainstem.facialSymmetryLevel > 0) bsParts.push(`facial asymmetry (level ${brainstem.facialSymmetryLevel})`);
    if (brainstem.hearingLevel > 0) bsParts.push(`hearing impairment (level ${brainstem.hearingLevel})`);
    if (brainstem.dysarthriaLevel > 0) bsParts.push(`dysarthria (level ${brainstem.dysarthriaLevel})`);
    if (brainstem.dysphagiaLevel > 0) bsParts.push(`dysphagia (level ${brainstem.dysphagiaLevel})`);
    const bsText = bsParts.length > 0
      ? `Brainstem: ${bsParts.join(', ')}.`
      : 'Brainstem examination normal.';
    sections.push(bsText);

    // Pyramidal - list specific weakness findings
    const weaknessFindings: string[] = [];

    // Upper limbs
    const upperMuscles = [
      { name: 'shoulder abduction', r: pyramidal.shoulderAbductionR, l: pyramidal.shoulderAbductionL },
      { name: 'shoulder external rotation', r: pyramidal.shoulderExternalRotationR, l: pyramidal.shoulderExternalRotationL },
      { name: 'elbow flexion', r: pyramidal.elbowFlexionR, l: pyramidal.elbowFlexionL },
      { name: 'elbow extension', r: pyramidal.elbowExtensionR, l: pyramidal.elbowExtensionL },
      { name: 'wrist extension', r: pyramidal.wristExtensionR, l: pyramidal.wristExtensionL },
      { name: 'finger abduction', r: pyramidal.fingerAbductionR, l: pyramidal.fingerAbductionL },
    ];

    // Lower limbs
    const lowerMuscles = [
      { name: 'hip flexion', r: pyramidal.hipFlexionR, l: pyramidal.hipFlexionL },
      { name: 'hip abduction', r: pyramidal.hipAbductionR, l: pyramidal.hipAbductionL },
      { name: 'knee extension', r: pyramidal.kneeExtensionR, l: pyramidal.kneeExtensionL },
      { name: 'knee flexion', r: pyramidal.kneeFlexionR, l: pyramidal.kneeFlexionL },
      { name: 'ankle dorsiflexion', r: pyramidal.ankleDorsiflexionR, l: pyramidal.ankleDorsiflexionL },
      { name: 'ankle plantarflexion', r: pyramidal.anklePlantarflexionR, l: pyramidal.anklePlantarflexionL },
    ];

    // Check for weakness in upper limbs
    for (const muscle of upperMuscles) {
      if (muscle.r < 5 && muscle.l < 5 && muscle.r === muscle.l) {
        weaknessFindings.push(`${muscle.name} ${muscle.r}/5 bilaterally`);
      } else {
        if (muscle.r < 5) weaknessFindings.push(`right ${muscle.name} ${muscle.r}/5`);
        if (muscle.l < 5) weaknessFindings.push(`left ${muscle.name} ${muscle.l}/5`);
      }
    }

    // Check for weakness in lower limbs
    for (const muscle of lowerMuscles) {
      if (muscle.r < 5 && muscle.l < 5 && muscle.r === muscle.l) {
        weaknessFindings.push(`${muscle.name} ${muscle.r}/5 bilaterally`);
      } else {
        if (muscle.r < 5) weaknessFindings.push(`right ${muscle.name} ${muscle.r}/5`);
        if (muscle.l < 5) weaknessFindings.push(`left ${muscle.name} ${muscle.l}/5`);
      }
    }

    const umnSigns: string[] = [];
    if (pyramidal.hyperreflexia) umnSigns.push('hyperreflexia');
    if (pyramidal.babinski) umnSigns.push('positive Babinski sign');
    if (pyramidal.clonus) umnSigns.push('clonus');
    if (pyramidal.spasticGait) umnSigns.push('spastic gait');
    if (pyramidal.fatigability) umnSigns.push('fatigability');

    let pText = 'Motor examination: ';
    if (weaknessFindings.length > 0 || umnSigns.length > 0) {
      const allFindings: string[] = [];
      if (weaknessFindings.length > 0) allFindings.push(weaknessFindings.join(', '));
      if (umnSigns.length > 0) allFindings.push(umnSigns.join(', '));
      pText += allFindings.join('; ') + '.';
    } else {
      pText += 'normal with full strength (MRC 5/5) throughout and no upper motor neuron signs.';
    }
    sections.push(pText);

    // Cerebellar
    const cParts: string[] = [];
    if (cerebellar.inabilityCoordinatedMovements) cParts.push('unable to perform coordinated movements');
    if (cerebellar.ataxiaThreeOrFourLimbs) cParts.push('ataxia in 3-4 limbs');
    if (cerebellar.needsAssistanceDueAtaxia) cParts.push('needs assistance due to ataxia');
    if (cerebellar.limbAtaxiaAffectsFunction) cParts.push('limb ataxia affecting function');
    if (cerebellar.gaitAtaxia) cParts.push('gait ataxia');
    if (cerebellar.truncalAtaxiaEO) cParts.push('truncal ataxia');
    if (cerebellar.tremorOrAtaxiaOnCoordTests) cParts.push('tremor/ataxia on coordination testing');
    if (cerebellar.rombergFallTendency) cParts.push('fall tendency on Romberg');
    if (cerebellar.lineWalkDifficulty) cParts.push('tandem gait difficulty');
    if (cerebellar.mildCerebellarSignsNoFunction) cParts.push('mild cerebellar signs without functional impact');
    const cText = cParts.length > 0
      ? `Cerebellar: ${cParts.join(', ')}.`
      : 'Cerebellar examination normal.';
    sections.push(cText);

    // Sensory
    const sParts: string[] = [];
    if (sensory.vibSeverity !== 'normal' && sensory.vibCount > 0) {
      sParts.push(`${sensory.vibSeverity} vibration sense deficit in ${sensory.vibCount} limb(s)`);
    }
    if (sensory.ptSeverity !== 'normal' && sensory.ptCount > 0) {
      sParts.push(`${sensory.ptSeverity} pain/touch deficit in ${sensory.ptCount} limb(s)`);
    }
    if (sensory.jpSeverity !== 'normal' && sensory.jpCount > 0) {
      sParts.push(`${sensory.jpSeverity} joint position sense deficit in ${sensory.jpCount} limb(s)`);
    }
    const sText = sParts.length > 0
      ? `Sensory examination: ${sParts.join(', ')}.`
      : 'Sensory examination normal.';
    sections.push(sText);

    // Bowel/Bladder
    const bladderParts: string[] = [];
    const bowelParts: string[] = [];
    if (bb.lossBladderFunction) bladderParts.push('loss of bladder function');
    else if (bb.permanentCatheter) bladderParts.push('permanent catheter');
    else if (bb.frequentIncontinence) bladderParts.push('frequent incontinence');
    else if (bb.intermittentCatheterization) bladderParts.push('intermittent catheterization');
    else if (bb.rareIncontinence) bladderParts.push('rare incontinence');
    else if (bb.moderateUrge) bladderParts.push('moderate urinary urgency');
    else if (bb.mildUrge) bladderParts.push('mild urinary urgency');

    if (bb.lossBowelFunction) bowelParts.push('loss of bowel function');
    else if (bb.bowelIncontinenceWeekly) bowelParts.push('weekly bowel incontinence');
    else if (bb.needsHelpForBowelMovement) bowelParts.push('needs assistance for bowel movements');
    else if (bb.severeConstipation) bowelParts.push('severe constipation');
    else if (bb.moderateConstipation) bowelParts.push('moderate constipation');
    else if (bb.mildConstipation) bowelParts.push('mild constipation');

    let bbText = 'Bowel and bladder function: ';
    if (bladderParts.length > 0 || bowelParts.length > 0) {
      const parts = [];
      if (bladderParts.length > 0) parts.push(bladderParts.join(', '));
      if (bowelParts.length > 0) parts.push(bowelParts.join(', '));
      bbText += parts.join('; ') + '.';
    } else {
      bbText += 'normal.';
    }
    sections.push(bbText);

    // Mental
    const cogParts: string[] = [];
    const fatigueParts: string[] = [];
    if (mental.pronouncedDementia) cogParts.push('pronounced dementia with disorientation');
    else if (mental.markedlyReducedCognition) cogParts.push('markedly reduced cognition, not oriented in 1-2 dimensions');
    else if (mental.moderatelyReducedCognition) cogParts.push('moderately reduced cognition with reduced test performance');
    else if (mental.lightlyReducedCognition) cogParts.push('lightly reduced cognition');

    if (mental.moderateToSevereFatigue) fatigueParts.push('moderate to severe fatigue affecting ≥50% of daily activities');
    else if (mental.mildFatigue) fatigueParts.push('mild fatigue affecting <50% of daily activities');

    let mText = 'Mental status: ';
    if (cogParts.length > 0 || fatigueParts.length > 0) {
      const parts = [];
      if (cogParts.length > 0) parts.push(cogParts.join(', '));
      if (fatigueParts.length > 0) parts.push(fatigueParts.join(', '));
      mText += parts.join('; ') + '.';
    } else {
      mText += 'normal cognition and no significant fatigue.';
    }
    sections.push(mText);

    // Ambulation
    const ambText = assistance === 'none'
      ? `Ambulation: walks ${parsedDistance ?? 'unknown'} meters without assistance.`
      : `Ambulation: ${assistanceLevels.find(a => a.id === assistance)?.label || assistance}.`;
    sections.push(ambText);

    // EDSS
    sections.push(`\nEDSS: ${edss.toFixed(1)}`);

    return sections.join(' ');
  }, [visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, parsedDistance, edss]);

  const [copied, setCopied] = useState(false);
  const [copiedExam, setCopiedExam] = useState(false);

  async function copySummary() {
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(()=>setCopied(false), 1600); }
    catch {
      const ta = document.createElement('textarea'); ta.value = summary; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setCopied(true); setTimeout(()=>setCopied(false), 1600);
    }
  }

  async function copyExamination() {
    try { await navigator.clipboard.writeText(examinationText); setCopiedExam(true); setTimeout(()=>setCopiedExam(false), 1600); }
    catch {
      const ta = document.createElement('textarea'); ta.value = examinationText; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setCopiedExam(true); setTimeout(()=>setCopiedExam(false), 1600);
    }
  }

  function resetAll() {
    setAssistance("none");
    setDistance("500");
    setFs({ V: 0, BS: 0, P: 0, C: 0, S: 0, BB: 0, M: 0 });
    setVisual({
      leftEyeAcuity: "1.0",
      rightEyeAcuity: "1.0",
      visualFieldDeficit: "none",
    });
    setBrainstem({
      eyeMotilityLevel: 0,
      nystagmusLevel: 0,
      facialSensibilityLevel: 0,
      facialSymmetryLevel: 0,
      hearingLevel: 0,
      dysarthriaLevel: 0,
      dysphagiaLevel: 0,
    });
    setPyramidal({
      shoulderAbductionR:5, shoulderAbductionL:5,
      shoulderExternalRotationR:5, shoulderExternalRotationL:5,
      elbowFlexionR:5, elbowFlexionL:5,
      elbowExtensionR:5, elbowExtensionL:5,
      wristExtensionR:5, wristExtensionL:5,
      fingerAbductionR:5, fingerAbductionL:5,
      hipFlexionR:5, hipFlexionL:5,
      hipAbductionR:5, hipAbductionL:5,
      kneeExtensionR:5, kneeExtensionL:5,
      kneeFlexionR:5, kneeFlexionL:5,
      ankleDorsiflexionR:5, ankleDorsiflexionL:5,
      anklePlantarflexionR:5, anklePlantarflexionL:5,
      hyperreflexia:false, babinski:false, clonus:false, spasticGait:false, fatigability:false,
    });
    setCerebellar({
      tremorOrAtaxiaOnCoordTests: false,
      rombergFallTendency: false,
      lineWalkDifficulty: false,
      limbAtaxiaAffectsFunction: false,
      gaitAtaxia: false,
      truncalAtaxiaEO: false,
      needsAssistanceDueAtaxia: false,
      ataxiaThreeOrFourLimbs: false,
      inabilityCoordinatedMovements: false,
      mildCerebellarSignsNoFunction: false,
    });
    setSensory({
      vibSeverity: 'normal', vibCount: 0,
      ptSeverity: 'normal', ptCount: 0,
      jpSeverity: 'normal', jpCount: 0,
    });
    setBB({
      mildUrge: false,
      mildConstipation: false,
      moderateUrge: false,
      moderateConstipation: false,
      rareIncontinence: false,
      severeConstipation: false,
      frequentIncontinence: false,
      intermittentCatheterization: false,
      needsHelpForBowelMovement: false,
      permanentCatheter: false,
      bowelIncontinenceWeekly: false,
      lossBladderFunction: false,
      lossBowelFunction: false,
    });
    setMental({
      mildFatigue: false,
      moderateToSevereFatigue: false,
      lightlyReducedCognition: false,
      moderatelyReducedCognition: false,
      markedlyReducedCognition: false,
      pronouncedDementia: false,
    });
  }

  // ---------- UI ----------
  function FSRow({ code, children }: { code: keyof typeof fsMeta; children: React.ReactNode }) {
    const meta = fsMeta[code];
    return (
      <div className="space-y-2 p-3 rounded-xl border bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{meta.label}</div>
            <div className="text-xs opacity-60">{meta.help}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs opacity-70">Override grade</label>
            <select className="rounded-xl border p-1 text-sm" value={fs[code]} onChange={(e)=> setFs((prev)=> ({...prev, [code]: clamp(Number(e.target.value), 0, meta.max)}))}>
              {Array.from({ length: meta.max + 1 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">{children}</div>
      </div>
    );
  }

  return (
    <>
      <style>{`html { overflow-anchor: none; }`}</style>
      <div className="min-h-screen w-full bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6" style={{ overflowAnchor: 'none' }}>
          <header className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">EDSS Calculator</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm opacity-60">Jonas Bull Haugsøen • Version 0.1</div>
              <button onClick={resetAll} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium">Reset</button>
            </div>
          </header>

          {/* V */}
          <FSRow code="V">
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Left eye acuity</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={visual.leftEyeAcuity} onChange={(e)=>setVisual({...visual, leftEyeAcuity: e.target.value as EyeAcuity})}>
                  <option value="1.0">1.0</option>
                  <option value="0.68-0.99">0.68-0.99</option>
                  <option value="0.34-0.67">0.34-0.67</option>
                  <option value="0.21-0.33">0.21-0.33</option>
                  <option value="0.10-0.20">0.10-0.20</option>
                  <option value="lt_0.10">&lt;0.10</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Right eye acuity</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={visual.rightEyeAcuity} onChange={(e)=>setVisual({...visual, rightEyeAcuity: e.target.value as EyeAcuity})}>
                  <option value="1.0">1.0</option>
                  <option value="0.68-0.99">0.68-0.99</option>
                  <option value="0.34-0.67">0.34-0.67</option>
                  <option value="0.21-0.33">0.21-0.33</option>
                  <option value="0.10-0.20">0.10-0.20</option>
                  <option value="lt_0.10">&lt;0.10</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Visual field deficit</div>
              <select className="w-full border rounded-lg p-1 text-sm" value={visual.visualFieldDeficit} onChange={(e)=>setVisual({...visual, visualFieldDeficit: e.target.value as VisualForm["visualFieldDeficit"]})}>
                <option value="none">None</option>
                <option value="mild">Mild (only on testing)</option>
                <option value="moderate">Moderate (patient notices deficit or complete hemianopia)</option>
                <option value="marked">Marked (complete hemianopia)</option>
              </select>
            </div>
          </FSRow>

          {/* BS */}
          <FSRow code="BS">
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Eye motility</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.eyeMotilityLevel} onChange={(e)=>setBrainstem({...brainstem, eyeMotilityLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Subtle findings, no symptoms</option>
                  <option value="2">2 - Subtle findings (patient aware) or clear incomplete paresis (patient unaware)</option>
                  <option value="3">3 - Clear incomplete paresis (patient aware) or complete loss in one direction</option>
                  <option value="4">4 - Complete loss in multiple directions</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Nystagmus</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.nystagmusLevel} onChange={(e)=>setBrainstem({...brainstem, nystagmusLevel: Number(e.target.value) as 0|1|2|3})}>
                  <option value="0">0 - None</option>
                  <option value="1">1 - Mild gaze-evoked nystagmus</option>
                  <option value="2">2 - Clear gaze-evoked nystagmus</option>
                  <option value="3">3 - Spontaneous nystagmus or complete INO</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Facial sensibility</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.facialSensibilityLevel} onChange={(e)=>setBrainstem({...brainstem, facialSensibilityLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Signs only</option>
                  <option value="2">2 - Decreased sensation</option>
                  <option value="3">3 - Decreased discrimination or trigeminal neuralgia &gt;24h</option>
                  <option value="4">4 - Complete sensory loss (uni/bilateral)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Facial symmetry</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.facialSymmetryLevel} onChange={(e)=>setBrainstem({...brainstem, facialSymmetryLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Signs only</option>
                  <option value="2">2 - Decreased facial strength</option>
                  <option value="3">3 - Incomplete facial palsy (eye patch at night or drooling)</option>
                  <option value="4">4 - Complete uni/bilateral facial palsy</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Hearing</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.hearingLevel} onChange={(e)=>setBrainstem({...brainstem, hearingLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Reduced hearing (finger rub) or Weber lateralization, no symptoms</option>
                  <option value="2">2 - Findings with patient awareness</option>
                  <option value="3">3 - Cannot hear finger rub or difficulty with whisper</option>
                  <option value="4">4 - Cannot hear whisper</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Dysarthria</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.dysarthriaLevel} onChange={(e)=>setBrainstem({...brainstem, dysarthriaLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Slurred speech (patient aware)</option>
                  <option value="2">2 - Difficult to understand due to slurring</option>
                  <option value="3">3 - Incomprehensible speech</option>
                  <option value="4">4 - Unable to speak</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Dysphagia</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.dysphagiaLevel} onChange={(e)=>setBrainstem({...brainstem, dysphagiaLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">0 - Normal</option>
                  <option value="1">1 - Difficulty swallowing liquids</option>
                  <option value="2">2 - Difficulty swallowing liquids and solids</option>
                  <option value="3">3 - Marked difficulty (dependent on pureed food)</option>
                  <option value="4">4 - Unable to swallow</option>
                </select>
              </div>
            </div>
          </FSRow>

          {/* P — Registry-style */}
          <FSRow code="P">
            {/* Upper limbs table */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Upper limbs (MRC 0–5)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">Movement</th>
                      <th className="py-1 pr-2">R</th>
                      <th className="py-1 pr-2">L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { keyR: 'shoulderAbductionR', keyL: 'shoulderAbductionL', label: 'Shoulder abduction' },
                      { keyR: 'shoulderExternalRotationR', keyL: 'shoulderExternalRotationL', label: 'Shoulder external rotation' },
                      { keyR: 'elbowFlexionR', keyL: 'elbowFlexionL', label: 'Elbow flexion' },
                      { keyR: 'elbowExtensionR', keyL: 'elbowExtensionL', label: 'Elbow extension' },
                      { keyR: 'wristExtensionR', keyL: 'wristExtensionL', label: 'Wrist extension' },
                      { keyR: 'fingerAbductionR', keyL: 'fingerAbductionL', label: 'Finger abduction' },
                    ].map((row) => (
                      <tr key={row.label} className="border-t">
                        <td className="py-1 pr-2">{row.label}</td>
                        <td className="py-1 pr-2">
                          <select className="border rounded-lg p-1" value={(pyramidal as any)[row.keyR]} onChange={(e)=> setPyramidal(prev=> ({...prev, [row.keyR]: Number(e.target.value)} as any))}>
                            {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <select className="border rounded-lg p-1" value={(pyramidal as any)[row.keyL]} onChange={(e)=> setPyramidal(prev=> ({...prev, [row.keyL]: Number(e.target.value)} as any))}>
                            {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lower limbs table */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Lower limbs (MRC 0–5)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">Movement</th>
                      <th className="py-1 pr-2">R</th>
                      <th className="py-1 pr-2">L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { keyR: 'hipFlexionR', keyL: 'hipFlexionL', label: 'Hip flexion' },
                      { keyR: 'hipAbductionR', keyL: 'hipAbductionL', label: 'Hip abduction' },
                      { keyR: 'kneeExtensionR', keyL: 'kneeExtensionL', label: 'Knee extension' },
                      { keyR: 'kneeFlexionR', keyL: 'kneeFlexionL', label: 'Knee flexion' },
                      { keyR: 'ankleDorsiflexionR', keyL: 'ankleDorsiflexionL', label: 'Ankle dorsiflexion' },
                      { keyR: 'anklePlantarflexionR', keyL: 'anklePlantarflexionL', label: 'Ankle plantarflexion' },
                    ].map((row) => (
                      <tr key={row.label} className="border-t">
                        <td className="py-1 pr-2">{row.label}</td>
                        <td className="py-1 pr-2">
                          <select className="border rounded-lg p-1" value={(pyramidal as any)[row.keyR]} onChange={(e)=> setPyramidal(prev=> ({...prev, [row.keyR]: Number(e.target.value)} as any))}>
                            {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <select className="border rounded-lg p-1" value={(pyramidal as any)[row.keyL]} onChange={(e)=> setPyramidal(prev=> ({...prev, [row.keyL]: Number(e.target.value)} as any))}>
                            {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pt-2 space-y-1">
                <div className="text-sm font-medium">Findings</div>
                {([
                  ["hyperreflexia","Hyperreflexia"], ["babinski","Babinski"], ["clonus","Clonus"], ["spasticGait","Spastic gait"], ["fatigability","Fatigability"]
                ] as const).map(([k,label])=> (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(pyramidal as any)[k]} onChange={(e)=> setPyramidal(prev=> ({...prev, [k]: e.target.checked} as any))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </FSRow>

          {/* C */}
          <FSRow code="C">
            <div className="space-y-2">
              <div className="text-sm font-medium">Minimal impact</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.tremorOrAtaxiaOnCoordTests} onChange={(e)=>setCerebellar({ ...cerebellar, tremorOrAtaxiaOnCoordTests: e.target.checked })}/>Tremor/ataxia on coordination tests</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.rombergFallTendency} onChange={(e)=>setCerebellar({ ...cerebellar, rombergFallTendency: e.target.checked })}/>Fall tendency on Romberg</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.lineWalkDifficulty} onChange={(e)=>setCerebellar({ ...cerebellar, lineWalkDifficulty: e.target.checked })}/>Difficulty on tandem/line walk</label>
              <label className="flex items-center gap-2 text-sm opacity-70"><input type="checkbox" checked={cerebellar.mildCerebellarSignsNoFunction} onChange={(e)=>setCerebellar({ ...cerebellar, mildCerebellarSignsNoFunction: e.target.checked })}/>Mild signs without functional loss</label>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Functional impact / severe</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.limbAtaxiaAffectsFunction} onChange={(e)=>setCerebellar({ ...cerebellar, limbAtaxiaAffectsFunction: e.target.checked })}/>Moderate limb ataxia affecting function</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.gaitAtaxia} onChange={(e)=>setCerebellar({ ...cerebellar, gaitAtaxia: e.target.checked })}/>Gait ataxia</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.truncalAtaxiaEO} onChange={(e)=>setCerebellar({ ...cerebellar, truncalAtaxiaEO: e.target.checked })}/>Truncal ataxia (eyes open)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.ataxiaThreeOrFourLimbs} onChange={(e)=>setCerebellar({ ...cerebellar, ataxiaThreeOrFourLimbs: e.target.checked })}/>Pronounced ataxia in 3–4 limbs</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.needsAssistanceDueAtaxia} onChange={(e)=>setCerebellar({ ...cerebellar, needsAssistanceDueAtaxia: e.target.checked })}/>Needs assistance due to ataxia</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.inabilityCoordinatedMovements} onChange={(e)=>setCerebellar({ ...cerebellar, inabilityCoordinatedMovements: e.target.checked })}/>Unable to perform coordinated movements due to ataxia</label>
            </div>
          </FSRow>

          {/* S — Registry-style */}
          <FSRow code="S">
            <div className="space-y-2">
              <div className="text-sm font-medium">Vibration</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">Severity</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.vibSeverity} onChange={(e)=> setSensory({...sensory, vibSeverity: e.target.value as Severity})}>
                  {['normal','mild','moderate','marked','absent'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="text-sm">Number of limbs (0–4)</label>
                <input type="number" min={0} max={4} className="border rounded-lg p-1" value={sensory.vibCount} onChange={(e)=> setSensory({...sensory, vibCount: clamp(Number(e.target.value),0,4)})}/>
              </div>
              <p className="text-xs opacity-70">Mild 1–2 → 1; Moderate 1–2 → 2; Mild 3–4 → 2; Moderate 3–4 → 3; Marked 3–4 → 4; Absent → 5.</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Pain / Touch</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">Severity</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.ptSeverity} onChange={(e)=> setSensory({...sensory, ptSeverity: e.target.value as Severity})}>
                  {['normal','mild','moderate','marked','absent'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="text-sm">Number of limbs (0–4)</label>
                <input type="number" min={0} max={4} className="border rounded-lg p-1" value={sensory.ptCount} onChange={(e)=> setSensory({...sensory, ptCount: clamp(Number(e.target.value),0,4)})}/>
              </div>
              <p className="text-xs opacity-70">Totally absent in 1–2 or marked 3–4 → 5; Marked 1–2 → 4; Moderate 1–2/3–4 → 3; Mild 3–4 → 3; Mild 1–2 → 2.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Joint Position</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">Severity</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.jpSeverity} onChange={(e)=> setSensory({...sensory, jpSeverity: e.target.value as Severity})}>
                  {['normal','mild','moderate','marked','absent'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="text-sm">Number of limbs (0–4)</label>
                <input type="number" min={0} max={4} className="border rounded-lg p-1" value={sensory.jpCount} onChange={(e)=> setSensory({...sensory, jpCount: clamp(Number(e.target.value),0,4)})}/>
              </div>
              <p className="text-xs opacity-70">Any joint position affected → FS ≥2. Absent in ≥2 → 5. Marked 3–4 → 4. Moderate 1–2/3–4 → 3. Mild 1–2 → 2.</p>
            </div>
          </FSRow>

          {/* BB */}
          <FSRow code="BB">
            <div className="space-y-1">
              <div className="text-sm font-medium">Bladder symptoms</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.mildUrge} onChange={(e)=>setBB({ ...bb, mildUrge: e.target.checked })}/>Mild urge</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.moderateUrge} onChange={(e)=>setBB({ ...bb, moderateUrge: e.target.checked })}/>Moderate urge</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.rareIncontinence} onChange={(e)=>setBB({ ...bb, rareIncontinence: e.target.checked })}/>Rare incontinence</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.frequentIncontinence} onChange={(e)=>setBB({ ...bb, frequentIncontinence: e.target.checked })}/>Frequent incontinence</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.intermittentCatheterization} onChange={(e)=>setBB({ ...bb, intermittentCatheterization: e.target.checked })}/>Intermittent catheterization</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.permanentCatheter} onChange={(e)=>setBB({ ...bb, permanentCatheter: e.target.checked })}/>Permanent catheter</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.lossBladderFunction} onChange={(e)=>setBB({ ...bb, lossBladderFunction: e.target.checked })}/>Loss of bladder function</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Bowel symptoms</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.mildConstipation} onChange={(e)=>setBB({ ...bb, mildConstipation: e.target.checked })}/>Mild constipation</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.moderateConstipation} onChange={(e)=>setBB({ ...bb, moderateConstipation: e.target.checked })}/>Moderate constipation</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.severeConstipation} onChange={(e)=>setBB({ ...bb, severeConstipation: e.target.checked })}/>Severe constipation</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.needsHelpForBowelMovement} onChange={(e)=>setBB({ ...bb, needsHelpForBowelMovement: e.target.checked })}/>Needs help for bowel movement</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.bowelIncontinenceWeekly} onChange={(e)=>setBB({ ...bb, bowelIncontinenceWeekly: e.target.checked })}/>Bowel incontinence weekly</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.lossBowelFunction} onChange={(e)=>setBB({ ...bb, lossBowelFunction: e.target.checked })}/>Loss of bowel function</label>
            </div>
          </FSRow>

          {/* M */}
          <FSRow code="M">
            <div className="space-y-1">
              <div className="text-sm font-medium">Fatigue</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.mildFatigue} onChange={(e)=>setMental({ ...mental, mildFatigue: e.target.checked })}/>Mild fatigue (affects &lt;50% of daily activity or work)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.moderateToSevereFatigue} onChange={(e)=>setMental({ ...mental, moderateToSevereFatigue: e.target.checked })}/>Moderate to severe fatigue (affects ≥50% of daily activity or work)</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Cognitive function</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.lightlyReducedCognition} onChange={(e)=>setMental({ ...mental, lightlyReducedCognition: e.target.checked })}/>Lightly reduced cognition</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.moderatelyReducedCognition} onChange={(e)=>setMental({ ...mental, moderatelyReducedCognition: e.target.checked })}/>Moderately reduced cognition (reduced test performance, oriented 3/3)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.markedlyReducedCognition} onChange={(e)=>setMental({ ...mental, markedlyReducedCognition: e.target.checked })}/>Markedly reduced cognition (not oriented for 1-2 of 3 dimensions)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.pronouncedDementia} onChange={(e)=>setMental({ ...mental, pronouncedDementia: e.target.checked })}/>Pronounced dementia (confusion, totally disoriented)</label>
            </div>
          </FSRow>

          {/* Ambulation + Result + Copy */}
          <section className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3 p-3 rounded-2xl bg-white border">
              <h2 className="text-xl font-semibold">Ambulation</h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Assistance requirement</label>
                <div className="grid gap-2">
                  {assistanceLevels.map((a) => (
                    <label key={a.id} className="flex items-center gap-2">
                      <input type="radio" name="assist" value={a.id} checked={assistance === a.id} onChange={(e) => setAssistance((e.target.value) as AssistanceId)} />
                      <span className="text-sm">{a.label}</span>
                    </label>
                  ))}
                </div>
                {assistance === "none" && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium">Max walking distance without aid/rest (meters)</label>
                    <input type="number" className="w-full rounded-xl border p-2" value={distance} min={0} max={2000} step={10} onChange={(e) => setDistance(e.target.value)} />
                    <div className="text-xs opacity-70">
                      Thresholds: ≥500m (EDSS based on FS), 300-499m (4.5), 200-299m (5.0), 100-199m (5.5), &lt;100m (6.0)
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="p-4 md:p-6 rounded-2xl bg-white shadow border">
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-black">{edss.toFixed(1)}</div>
                <div className="text-sm uppercase tracking-wide opacity-60">EDSS</div>
              </div>
              <div className="mt-2 text-sm opacity-80">{result.rationale}</div>
              <div className="mt-4 text-xs opacity-70">
                <div>Raw FS: {countFS(0)}×0, {countFS(1)}×1, {countFS(2)}×2, {countFS(3)}×3, {countFS(4)}×4, {countFS(5)}×5, {countFS(6)}×6</div>
                <div className="mt-1">Corrected FS (for EDSS): {countCorrectedFS(0)}×0, {countCorrectedFS(1)}×1, {countCorrectedFS(2)}×2, {countCorrectedFS(3)}×3, {countCorrectedFS(4)}×4, {countCorrectedFS(5)}×5</div>
              </div>

              <div className="mt-6 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">Quick Summary</div>
                <pre className="whitespace-pre-wrap text-xs">{summary}</pre>
                <button onClick={copySummary} className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copied ? 'Copied ✓' : 'Copy summary'}</button>
              </div>

              <div className="mt-4 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">Full Examination Text</div>
                <pre className="whitespace-pre-wrap text-xs">{examinationText}</pre>
                <button onClick={copyExamination} className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copiedExam ? 'Copied ✓' : 'Copy examination text'}</button>
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
}