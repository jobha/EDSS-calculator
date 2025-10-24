import React, { useEffect, useMemo, useState } from "react";
import { Language, translations } from "./i18n/translations";
import type { AssistanceId, EyeAcuity, Severity } from "./types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm } from "./types/forms";
import { assistanceLevelIds } from "./types/edss";
import { clamp, roundToHalf } from "./utils/helpers";
import { formatEyeAcuity } from "./utils/formatting";
import { suggestV, suggestBS, suggestP, suggestC, suggestS, suggestBB, suggestM } from "./utils/scoring";
import { computeEDSSFromInputs, convertVisualForEDSS, convertBBForEDSS, correctedFS, computeAmbulationEDSS, computeLowEDSS_Neurostatus } from "./utils/edss";
import { FSRow } from "./components/FSRow";
import { validateEDSSInputs, type ValidationWarning } from "./utils/validation";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const fsMeta: Record<string, { label: string; max: number; help: string }> = {
  V: { label: "V (Visual)", max: 6, help: "Acuity/scotoma; 0-6" },
  BS: { label: "BS (Brainstem)", max: 5, help: "INO, dysarthria, nystagmus; 0-5" },
  P: { label: "P (Pyramidal)", max: 6, help: "Muscle strength + UMN/gait; 0-6" },
  C: { label: "C (Cerebellar)", max: 5, help: "FNF/HKS, DDK, truncal; 0-5" },
  S: { label: "S (Sensory)", max: 6, help: "Pinprick, vibration, proprioception; 0-6" },
  BB: { label: "BB (Bowel/Bladder)", max: 6, help: "Urgency, incontinence, catheter; 0-6" },
  M: { label: "M (Cerebral)", max: 5, help: "Cognition/mood; 0-5" },
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const t = translations[language];

  // Translated assistance levels
  const assistanceLevels = [
    { id: "none" as const, label: t.noAssistance },
    { id: "uni_50_plus" as const, label: t.uniAid50Plus },
    { id: "uni_under_50" as const, label: t.uniAidUnder50 },
    { id: "bi_120_plus" as const, label: t.biAid120Plus },
    { id: "bi_5_to_120" as const, label: t.biAid5to120 },
    { id: "bi_under_5" as const, label: t.biAidUnder5 },
    { id: "wheel_self" as const, label: t.wheelSelf },
    { id: "wheel_some_help" as const, label: t.wheelSomeHelp },
    { id: "wheel_dependent" as const, label: t.wheelDependent },
    { id: "bed_chair_arms_ok" as const, label: t.bedChairArmsOk },
    { id: "bed_chair_limited_arms" as const, label: t.bedChairLimitedArms },
    { id: "helpless" as const, label: t.helpless },
    { id: "total_care" as const, label: t.totalCare },
  ];

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
    hyperreflexiaLeft:false, hyperreflexiaRight:false,
    babinskiLeft:false, babinskiRight:false,
    clonusLeft:false, clonusRight:false,
    spasticGait:false, fatigability:false,
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
    vibRightArm: false, vibLeftArm: false, vibRightLeg: false, vibLeftLeg: false,
    ptSeverity: 'normal', ptCount: 0,
    ptRightArm: false, ptLeftArm: false, ptRightLeg: false, ptLeftLeg: false,
    jpSeverity: 'normal', jpCount: 0,
    jpRightArm: false, jpLeftArm: false, jpRightLeg: false, jpLeftLeg: false,
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

  const [showExplainModal, setShowExplainModal] = useState(false);

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

  // Separate FS-based and ambulation-based scores for modal display
  const fsBasedEDSS = useMemo(() => {
    const correctedFSValues = correctedFS(fs);
    return computeLowEDSS_Neurostatus(correctedFSValues);
  }, [fs]);

  const ambulationBasedEDSS = useMemo(() => {
    return computeAmbulationEDSS(assistance, parsedDistance);
  }, [assistance, parsedDistance]);

  // Determine which table row matches the current patient's FS pattern
  const matchingFSRowIndex = useMemo(() => {
    if (!fsBasedEDSS) return -1;
    const correctedFSValues = correctedFS(fs);
    const v = Object.values(correctedFSValues);
    const cnt = (n: number) => v.filter((x) => x === n).length;
    const max = Math.max(...v);
    const cnt1 = cnt(1), cnt2 = cnt(2), cnt3 = cnt(3), cnt4 = cnt(4), cnt5 = cnt(5);

    if (v.every((x) => x === 0)) return 0;
    if (cnt1 === 1 && max === 1) return 1;
    if (cnt1 > 1 && max === 1) return 2;
    if (cnt2 === 1 && max === 2) return 3;
    if (cnt2 === 2 && max === 2) return 4;
    if (cnt2 === 0 && cnt3 === 1 && max === 3) return 5;
    if (cnt2 >= 3 && cnt2 <= 4 && max === 2) return 6;
    if (cnt2 >= 1 && cnt2 <= 2 && cnt3 === 1 && max === 3) return 7;
    if (cnt2 === 0 && cnt3 === 2 && max === 3) return 8;
    if (cnt2 === 5 && max === 2) return 9;
    if (cnt2 === 0 && cnt3 === 0 && cnt4 === 1 && max === 4) return 10;
    if (cnt2 === 0 && cnt3 >= 3 && cnt3 <= 4 && max === 3) return 11;
    if (cnt2 >= 3 && cnt3 === 1 && max === 3) return 12;
    if (cnt2 > 0 && cnt3 >= 2 && cnt3 <= 4 && max === 3) return 13;
    if (cnt2 > 5 && max === 2) return 14;
    if (cnt3 === 5 && max === 3) return 15;
    if (cnt3 >= 1 && cnt3 <= 2 && cnt4 === 1 && max === 4) return 16;
    if (cnt2 >= 1 && cnt4 === 1 && max === 4) return 17;
    if (cnt5 >= 1) return 18;
    if (cnt4 >= 2) return 19;
    if (cnt3 >= 6) return 20;
    return -1;
  }, [fsBasedEDSS, fs]);

  // Validation warnings
  const warnings = useMemo(() =>
    validateEDSSInputs(fs, assistance, parsedDistance, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, edss, t),
    [fs, assistance, parsedDistance, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, edss, t]
  );

  const countFS = (grade: number) => Object.values(fs).filter((v) => v === grade).length;

  // Corrected FS values for EDSS calculation
  const correctedFSForDisplay = useMemo(() => correctedFS(fs), [fs]);
  const countCorrectedFS = (grade: number) => Object.values(correctedFSForDisplay).filter((v) => v === grade).length;

  // Translate rationale text from English to current language
  const translateRationale = (rationale: string): string => {
    // Map English rationale strings to translation keys
    const rationaleMap: Record<string, string> = {
      "Walks ≥50 m with unilateral aid": t.walksWithUnilateralAid50Plus,
      "Walks <50 m with unilateral aid": t.walksWithUnilateralAidUnder50,
      "Walks ≥120 m with bilateral aid": t.walksWithBilateralAid120Plus,
      "Walks ≥5 m but <120 m with bilateral aid": t.walksWithBilateralAid5To120,
      "Walks <5 m with bilateral aid": t.walksWithBilateralAidUnder5,
      "Wheelchair; self-propels and transfers independently": t.wheelchairSelfPropels,
      "Wheelchair; needs help with transfers, self-propels": t.wheelchairNeedsHelp,
      "Wheelchair; completely dependent": t.wheelchairDependent,
      "Bed/chair; arms effective": t.bedChairArmsEffective,
      "Bed-bound; limited arm use": t.bedBoundLimitedArms,
      "Helpless bedridden": t.helplessBedridden,
      "Totally helpless; total care": t.totallyHelpless,
      "Walks 300-499 m unaided": t.walks300to499Unaided,
      "Walks 200-299 m unaided": t.walks200to299Unaided,
      "Walks 100-199 m unaided": t.walks100to199Unaided,
      "Walks <100 m unaided": t.walksUnder100Unaided,
    };

    // Check for direct match first
    if (rationaleMap[rationale]) {
      return rationaleMap[rationale];
    }

    // Handle "(raised to X due to max FS=Y)" suffix
    const raisedMatch = rationale.match(/^(.+?)\s+\(raised to ([\d.]+) due to max FS=(\d+)\)$/);
    if (raisedMatch) {
      const [, baseRationale, edssValue, maxFSValue] = raisedMatch;
      const translatedBase = rationaleMap[baseRationale] || baseRationale;
      const suffix = t.raisedDueToMaxFS.replace('{edss}', edssValue).replace('{maxFS}', maxFSValue);
      return `${translatedBase} ${suffix}`;
    }

    // Return as-is if no translation found
    return rationale;
  };

  // Summary (multi-line, copy-ready)
  const summary = useMemo(() => {
    const ambFinding = assistance === 'none'
      ? (parsedDistance != null ? `${t.unaided} ${parsedDistance} m` : `${t.unaided} (n/a)`)
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

    // UMN signs
    const hyperreflexiaSides = [];
    if (pyramidal.hyperreflexiaLeft) hyperreflexiaSides.push('L');
    if (pyramidal.hyperreflexiaRight) hyperreflexiaSides.push('R');
    const hyperreflexiaText = hyperreflexiaSides.length > 0 ? `${t.hyperreflexia.toLowerCase()} ${hyperreflexiaSides.join('+')}` : '';

    const babinskiSides = [];
    if (pyramidal.babinskiLeft) babinskiSides.push('L');
    if (pyramidal.babinskiRight) babinskiSides.push('R');
    const babinskiText = babinskiSides.length > 0 ? `${t.babinski} ${babinskiSides.join('+')}` : '';

    const clonusSides = [];
    if (pyramidal.clonusLeft) clonusSides.push('L');
    if (pyramidal.clonusRight) clonusSides.push('R');
    const clonusText = clonusSides.length > 0 ? `${t.clonus.toLowerCase()} ${clonusSides.join('+')}` : '';

    const pFlags = [
      minMRC < 5 && `${t.minGrade} ${minMRC}`,
      hyperreflexiaText,
      babinskiText,
      clonusText,
      pyramidal.spasticGait && t.spasticGait,
      pyramidal.fatigability && t.fatigue
    ].filter(Boolean).join(', ');
    const pSummary = pFlags || t.normal;

    // Visual summary
    const vCorrected = convertVisualForEDSS(fs.V);
    const leftAcuity = formatEyeAcuity(visual.leftEyeAcuity);
    const rightAcuity = formatEyeAcuity(visual.rightEyeAcuity);
    const vfDeficitText = visual.visualFieldDeficit === 'mild' ? t.mild :
                          visual.visualFieldDeficit === 'moderate' ? t.moderate :
                          visual.visualFieldDeficit === 'marked' ? t.marked : '';
    const vfDeficit = visual.visualFieldDeficit !== 'none' ? `, ${vfDeficitText} ${t.vfDeficit}` : '';
    const vSummary = `L: ${leftAcuity}, R: ${rightAcuity}${vfDeficit}`;

    // Brainstem summary
    const bsFindings = [
      brainstem.eyeMotilityLevel > 0 && `${t.eyeMotility} ${brainstem.eyeMotilityLevel}`,
      brainstem.nystagmusLevel > 0 && `${t.nystagmus} ${brainstem.nystagmusLevel}`,
      brainstem.facialSensibilityLevel > 0 && `${t.facialSens} ${brainstem.facialSensibilityLevel}`,
      brainstem.facialSymmetryLevel > 0 && `${t.facialSym} ${brainstem.facialSymmetryLevel}`,
      brainstem.hearingLevel > 0 && `${t.hearing} ${brainstem.hearingLevel}`,
      brainstem.dysarthriaLevel > 0 && `${t.dysarthria} ${brainstem.dysarthriaLevel}`,
      brainstem.dysphagiaLevel > 0 && `${t.dysphagia} ${brainstem.dysphagiaLevel}`,
    ].filter(Boolean).join(', ');
    const bsSummary = bsFindings || t.normal;

    // Cerebellar summary
    const cFindings = [
      cerebellar.inabilityCoordinatedMovements && t.unableCoordinatedMovements,
      cerebellar.ataxiaThreeOrFourLimbs && t.ataxia34Limbs,
      cerebellar.needsAssistanceDueAtaxia && t.needsAssistance,
      cerebellar.limbAtaxiaAffectsFunction && t.limbAtaxiaAffectsFunction,
      cerebellar.gaitAtaxia && t.gaitAtaxia,
      cerebellar.truncalAtaxiaEO && t.truncalAtaxia,
      cerebellar.tremorOrAtaxiaOnCoordTests && t.tremorAtaxiaOnTesting,
      cerebellar.rombergFallTendency && t.rombergFall,
      cerebellar.lineWalkDifficulty && t.tandemWalkDifficulty,
    ].filter(Boolean).join(', ');
    const cSummary = cFindings || t.normal;

    // Sensory summary
    const getSeverityText = (severity: string) => {
      if (severity === 'mild') return t.mild;
      if (severity === 'moderate') return t.moderate;
      if (severity === 'marked') return t.marked;
      return severity;
    };
    const sFindings = [
      sensory.vibSeverity !== 'normal' && sensory.vibCount > 0 && `${t.vib} ${getSeverityText(sensory.vibSeverity)} ${sensory.vibCount} ${t.limbs}`,
      sensory.ptSeverity !== 'normal' && sensory.ptCount > 0 && `${t.painTouch} ${getSeverityText(sensory.ptSeverity)} ${sensory.ptCount} ${t.limbs}`,
      sensory.jpSeverity !== 'normal' && sensory.jpCount > 0 && `${t.jointPos} ${getSeverityText(sensory.jpSeverity)} ${sensory.jpCount} ${t.limbs}`,
    ].filter(Boolean).join(', ');
    const sSummary = sFindings || t.normal;

    // Bowel/Bladder summary
    const bbFindings = [
      bb.lossBladderFunction && t.lossBladderFunction,
      bb.lossBowelFunction && t.lossBowelFunction,
      bb.permanentCatheter && t.permanentCatheter,
      bb.bowelIncontinenceWeekly && t.bowelIncontinenceWeekly,
      bb.frequentIncontinence && t.frequentIncontinence,
      bb.intermittentCatheterization && t.intermittentCath,
      bb.needsHelpForBowelMovement && t.needsHelpForBM,
      bb.moderateUrge && t.moderateUrge,
      bb.moderateConstipation && t.moderateConstipation,
      bb.rareIncontinence && t.rareIncontinence,
      bb.severeConstipation && t.severeConstipation,
      bb.mildUrge && t.mildUrge,
      bb.mildConstipation && t.mildConstipation,
    ].filter(Boolean).join(', ');
    const bbCorrected = convertBBForEDSS(fs.BB);
    const bbSummary = bbFindings || t.normal;

    // Mental summary
    const mFindings = [
      mental.pronouncedDementia && t.pronouncedDementia,
      mental.markedlyReducedCognition && t.markedlyReducedCog,
      mental.moderatelyReducedCognition && t.moderatelyReducedCog,
      mental.lightlyReducedCognition && t.lightlyReducedCog,
      mental.moderateToSevereFatigue && t.moderateSevereFatigue,
      mental.mildFatigue && t.mildFatigue,
    ].filter(Boolean).join(', ');
    const mSummary = mFindings || t.normal;

    const ambulation = computeAmbulationEDSS(assistance, parsedDistance);
    const ambulationDisplay = ambulation
      ? `Ambulation ${ambulation.edss.toFixed(1)} (${ambFinding})`
      : assistance === 'none'
        ? `Ambulation 0 (${ambFinding})`
        : `Ambulation - (${ambFinding})`;

    const lines = [
      `EDSS ${edss.toFixed(1)}`,
      ambulationDisplay,
      `P ${fs.P}${pSummary !== t.normal ? ` (${pSummary})` : ''}`,
      `V ${fs.V}${fs.V !== vCorrected ? ` (${t.corrected}: ${vCorrected})` : ''}${vSummary !== 'L: 1.0, R: 1.0' || visual.visualFieldDeficit !== 'none' ? ` (${vSummary})` : ''}`,
      `BS ${fs.BS}${bsSummary !== t.normal ? ` (${bsSummary})` : ''}`,
      `C ${fs.C}${cSummary !== t.normal ? ` (${cSummary})` : ''}`,
      `S ${fs.S}${sSummary !== t.normal ? ` (${sSummary})` : ''}`,
      `BB ${fs.BB}${fs.BB !== bbCorrected ? ` (${t.corrected}: ${bbCorrected})` : ''}${bbSummary !== t.normal ? ` (${bbSummary})` : ''}`,
      `M ${fs.M}${mSummary !== t.normal ? ` (${mSummary})` : ''}`,
    ];
    return lines.join('\n');
  }, [edss, fs, assistance, parsedDistance, pyramidal, visual, brainstem, cerebellar, sensory, bb, mental, t]);

  // Full examination text (narrative format with normal findings)
  const examinationText = useMemo(() => {
    // Helper function to join array items with commas and "and" before last item
    const joinWithAnd = (items: string[], andWord: string): string => {
      if (items.length === 0) return '';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} ${andWord} ${items[1]}`;
      return items.slice(0, -1).join(', ') + ` ${andWord} ${items[items.length - 1]}`;
    };

    // Helper function to capitalize first letter of a string
    const capitalize = (str: string): string => {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const sections: string[] = [];

    // Visual
    const leftAcuity = formatEyeAcuity(visual.leftEyeAcuity);
    const rightAcuity = formatEyeAcuity(visual.rightEyeAcuity);
    const bothEyes10 = visual.leftEyeAcuity === "1.0" && visual.rightEyeAcuity === "1.0";

    if (bothEyes10 && visual.visualFieldDeficit === 'none') {
      // Completely normal vision
      sections.push(t.visualExamNormal + '.');
    } else if (bothEyes10 && visual.visualFieldDeficit !== 'none') {
      // Normal acuity but visual field deficit
      const vfText = visual.visualFieldDeficit === 'mild' ? t.vfMild.toLowerCase() :
                     visual.visualFieldDeficit === 'moderate' ? t.vfModerate.toLowerCase() :
                     t.vfMarked.toLowerCase();
      sections.push(`${t.visualAcuity} ${t.sensNormal.toLowerCase()}, ${vfText} ${t.visualFieldDeficitText}.`);
    } else {
      // Abnormal acuity (with or without VF deficit)
      let visualText = `${t.leftEye} ${leftAcuity}, ${t.rightEye} ${rightAcuity}`;
      if (visual.visualFieldDeficit !== 'none') {
        const vfText = visual.visualFieldDeficit === 'mild' ? t.vfMild.toLowerCase() :
                       visual.visualFieldDeficit === 'moderate' ? t.vfModerate.toLowerCase() :
                       t.vfMarked.toLowerCase();
        visualText += `, ${vfText} ${t.visualFieldDeficitText}`;
      }
      visualText += '.';
      sections.push(visualText);
    }

    // Brainstem
    const bsParts: string[] = [];
    if (brainstem.eyeMotilityLevel > 0) bsParts.push(`${t.eyeMotilityImpairment} (${t.level} ${brainstem.eyeMotilityLevel})`);
    if (brainstem.nystagmusLevel > 0) bsParts.push(`${t.nystagmus.toLowerCase()} (${t.level} ${brainstem.nystagmusLevel})`);
    if (brainstem.facialSensibilityLevel > 0) bsParts.push(`${t.facialSensibilityDeficit} (${t.level} ${brainstem.facialSensibilityLevel})`);
    if (brainstem.facialSymmetryLevel > 0) bsParts.push(`${t.facialAsymmetry} (${t.level} ${brainstem.facialSymmetryLevel})`);
    if (brainstem.hearingLevel > 0) bsParts.push(`${t.hearingImpairment} (${t.level} ${brainstem.hearingLevel})`);
    if (brainstem.dysarthriaLevel > 0) bsParts.push(`${t.dysarthria.toLowerCase()} (${t.level} ${brainstem.dysarthriaLevel})`);
    if (brainstem.dysphagiaLevel > 0) bsParts.push(`${t.dysphagia.toLowerCase()} (${t.level} ${brainstem.dysphagiaLevel})`);
    if (bsParts.length > 0) {
      sections.push(capitalize(bsParts.join(', ')) + '.');
    } else {
      sections.push(t.brainstemExamNormal + '.');
    }

    // Pyramidal - list specific weakness findings with new narrative format
    const weaknessFindings: string[] = [];

    // Define all muscles with structured components
    const allMuscles = [
      { bodyPart: t.movements.shoulder, movement: t.movements.abduction, r: pyramidal.shoulderAbductionR, l: pyramidal.shoulderAbductionL },
      { bodyPart: t.movements.shoulder, movement: t.movements.externalRotation, r: pyramidal.shoulderExternalRotationR, l: pyramidal.shoulderExternalRotationL },
      { bodyPart: t.movements.elbow, movement: t.movements.flexion, r: pyramidal.elbowFlexionR, l: pyramidal.elbowFlexionL },
      { bodyPart: t.movements.elbow, movement: t.movements.extension, r: pyramidal.elbowExtensionR, l: pyramidal.elbowExtensionL },
      { bodyPart: t.movements.wrist, movement: t.movements.extension, r: pyramidal.wristExtensionR, l: pyramidal.wristExtensionL },
      { bodyPart: t.movements.finger, movement: t.movements.abduction, r: pyramidal.fingerAbductionR, l: pyramidal.fingerAbductionL },
      { bodyPart: t.movements.hip, movement: t.movements.flexion, r: pyramidal.hipFlexionR, l: pyramidal.hipFlexionL },
      { bodyPart: t.movements.hip, movement: t.movements.abduction, r: pyramidal.hipAbductionR, l: pyramidal.hipAbductionL },
      { bodyPart: t.movements.knee, movement: t.movements.extension, r: pyramidal.kneeExtensionR, l: pyramidal.kneeExtensionL },
      { bodyPart: t.movements.knee, movement: t.movements.flexion, r: pyramidal.kneeFlexionR, l: pyramidal.kneeFlexionL },
      { bodyPart: t.movements.ankle, movement: t.movements.dorsiflexion, r: pyramidal.ankleDorsiflexionR, l: pyramidal.ankleDorsiflexionL },
      { bodyPart: t.movements.ankle, movement: t.movements.plantarflexion, r: pyramidal.anklePlantarflexionR, l: pyramidal.anklePlantarflexionL },
    ];

    // Generate weakness findings with new format: "grad X for [movement] [side] [bodyPart]"
    for (const muscle of allMuscles) {
      if (muscle.r < 5 && muscle.l < 5 && muscle.r === muscle.l) {
        weaknessFindings.push(`${t.grade} ${muscle.r} ${t.for} ${muscle.movement} ${t.bilaterally} ${muscle.bodyPart}`);
      } else {
        if (muscle.r < 5) weaknessFindings.push(`${t.grade} ${muscle.r} ${t.for} ${muscle.movement} ${t.right} ${muscle.bodyPart}`);
        if (muscle.l < 5) weaknessFindings.push(`${t.grade} ${muscle.l} ${t.for} ${muscle.movement} ${t.left} ${muscle.bodyPart}`);
      }
    }

    const umnSigns: string[] = [];

    // Lateralized UMN signs
    if (pyramidal.hyperreflexiaLeft || pyramidal.hyperreflexiaRight) {
      const side = pyramidal.hyperreflexiaLeft && pyramidal.hyperreflexiaRight ? t.bilaterally :
                   pyramidal.hyperreflexiaLeft ? t.left :
                   t.right;
      umnSigns.push(`${t.hyperreflexia.toLowerCase()} ${side}`);
    }
    if (pyramidal.babinskiLeft || pyramidal.babinskiRight) {
      const side = pyramidal.babinskiLeft && pyramidal.babinskiRight ? t.bilaterally :
                   pyramidal.babinskiLeft ? t.left :
                   t.right;
      umnSigns.push(`${t.positiveBarbinskiSign} ${side}`);
    }
    if (pyramidal.clonusLeft || pyramidal.clonusRight) {
      const side = pyramidal.clonusLeft && pyramidal.clonusRight ? t.bilaterally :
                   pyramidal.clonusLeft ? t.left :
                   t.right;
      umnSigns.push(`${t.clonus.toLowerCase()} ${side}`);
    }

    // Non-lateralized UMN signs
    if (pyramidal.spasticGait) umnSigns.push(t.spasticGaitText);
    if (pyramidal.fatigability) umnSigns.push(t.fatigability.toLowerCase());

    if (weaknessFindings.length > 0 || umnSigns.length > 0) {
      const allFindings: string[] = [];
      if (weaknessFindings.length > 0) {
        // Start with "Reduced strength" and then list the findings with "and" before last item
        allFindings.push(`${t.reducedStrength} ${joinWithAnd(weaknessFindings, t.and)}`);
      }
      if (umnSigns.length > 0) allFindings.push(capitalize(umnSigns.join(', ')));
      sections.push(allFindings.join('; ') + '.');
    } else {
      sections.push(capitalize(`${t.normal} ${t.withFullStrength}.`));
    }

    // Cerebellar
    const cParts: string[] = [];
    if (cerebellar.inabilityCoordinatedMovements) cParts.push(t.unableCoordMovementsText);
    if (cerebellar.ataxiaThreeOrFourLimbs) cParts.push(t.ataxiaIn34Limbs);
    if (cerebellar.needsAssistanceDueAtaxia) cParts.push(t.needsAssistanceAtaxiaText);
    if (cerebellar.limbAtaxiaAffectsFunction) cParts.push(t.limbAtaxiaAffectingFunction);
    if (cerebellar.gaitAtaxia) cParts.push(t.gaitAtaxiaText);
    if (cerebellar.truncalAtaxiaEO) cParts.push(t.truncalAtaxiaText);
    if (cerebellar.tremorOrAtaxiaOnCoordTests) cParts.push(t.tremorAtaxiaCoordTesting);
    if (cerebellar.rombergFallTendency) cParts.push(t.fallTendencyRomberg);
    if (cerebellar.lineWalkDifficulty) cParts.push(t.tandemGaitDifficulty);
    if (cerebellar.mildCerebellarSignsNoFunction) cParts.push(t.mildCerebellarSignsNoFunction);
    if (cParts.length > 0) {
      sections.push(capitalize(cParts.join(', ')) + '.');
    } else {
      sections.push(t.cerebellarExamNormal + '.');
    }

    // Sensory
    const sParts: string[] = [];
    const getSensText = (sev: string) => sev === 'normal' ? t.sensNormal : sev === 'mild' ? t.sensMild : sev === 'moderate' ? t.sensModerate : sev === 'marked' ? t.sensMarked : t.sensAbsent;

    // Helper to get limb list
    const getLimbList = (ra: boolean, la: boolean, rl: boolean, ll: boolean): string => {
      const limbs: string[] = [];
      if (ra) limbs.push(t.rightArm);
      if (la) limbs.push(t.leftArm);
      if (rl) limbs.push(t.rightLeg);
      if (ll) limbs.push(t.leftLeg);
      return joinWithAnd(limbs, language === 'en' ? 'and' : 'og');
    };

    if (sensory.vibSeverity !== 'normal' && sensory.vibCount > 0) {
      const limbList = getLimbList(sensory.vibRightArm, sensory.vibLeftArm, sensory.vibRightLeg, sensory.vibLeftLeg);
      if (sensory.vibSeverity === 'absent') {
        sParts.push(`${getSensText(sensory.vibSeverity).toLowerCase()} ${t.vibration.toLowerCase()} ${limbList}`);
      } else {
        sParts.push(`${getSensText(sensory.vibSeverity)} ${t.vibrationSenseDeficit} ${limbList}`);
      }
    }
    if (sensory.ptSeverity !== 'normal' && sensory.ptCount > 0) {
      const limbList = getLimbList(sensory.ptRightArm, sensory.ptLeftArm, sensory.ptRightLeg, sensory.ptLeftLeg);
      if (sensory.ptSeverity === 'absent') {
        sParts.push(`${getSensText(sensory.ptSeverity).toLowerCase()} ${t.painTouch.toLowerCase()} ${limbList}`);
      } else {
        sParts.push(`${getSensText(sensory.ptSeverity)} ${t.painTouchDeficit} ${limbList}`);
      }
    }
    if (sensory.jpSeverity !== 'normal' && sensory.jpCount > 0) {
      const limbList = getLimbList(sensory.jpRightArm, sensory.jpLeftArm, sensory.jpRightLeg, sensory.jpLeftLeg);
      if (sensory.jpSeverity === 'absent') {
        sParts.push(`${getSensText(sensory.jpSeverity).toLowerCase()} ${t.jointPosition.toLowerCase()} ${limbList}`);
      } else {
        sParts.push(`${getSensText(sensory.jpSeverity)} ${t.jointPositionDeficit} ${limbList}`);
      }
    }
    if (sParts.length > 0) {
      sections.push(capitalize(sParts.join(', ')) + '.');
    } else {
      sections.push(t.sensoryExaminationNormal + '.');
    }

    // Bowel/Bladder
    const bladderParts: string[] = [];
    const bowelParts: string[] = [];
    if (bb.lossBladderFunction) bladderParts.push(t.lossBladderFunction.toLowerCase());
    if (bb.permanentCatheter) bladderParts.push(t.permanentCath.toLowerCase());
    if (bb.frequentIncontinence) bladderParts.push(t.frequentIncontinence.toLowerCase());
    if (bb.intermittentCatheterization) bladderParts.push(t.intermittentCath.toLowerCase());
    if (bb.rareIncontinence) bladderParts.push(t.rareIncontinence.toLowerCase());
    if (bb.moderateUrge) bladderParts.push(t.moderateUrge.toLowerCase());
    if (bb.mildUrge) bladderParts.push(t.mildUrge.toLowerCase());

    if (bb.lossBowelFunction) bowelParts.push(t.lossBowelFunction.toLowerCase());
    if (bb.bowelIncontinenceWeekly) bowelParts.push(t.bowelIncontinenceWeekly.toLowerCase());
    if (bb.needsHelpForBowelMovement) bowelParts.push(t.needsHelpBM.toLowerCase());
    if (bb.severeConstipation) bowelParts.push(t.severeConstipation.toLowerCase());
    if (bb.moderateConstipation) bowelParts.push(t.moderateConstipation.toLowerCase());
    if (bb.mildConstipation) bowelParts.push(t.mildConstipation.toLowerCase());

    if (bladderParts.length > 0 || bowelParts.length > 0) {
      const parts = [];
      if (bladderParts.length > 0) parts.push(bladderParts.join(', '));
      if (bowelParts.length > 0) parts.push(bowelParts.join(', '));
      sections.push(capitalize(parts.join('; ')) + '.');
    } else {
      sections.push(t.bowelBladderNormal + '.');
    }

    // Mental
    const cogParts: string[] = [];
    const fatigueParts: string[] = [];
    if (mental.pronouncedDementia) cogParts.push(t.pronouncedDementia.toLowerCase());
    else if (mental.markedlyReducedCognition) cogParts.push(t.markedlyReducedCog.toLowerCase());
    else if (mental.moderatelyReducedCognition) cogParts.push(t.moderatelyReducedCog.toLowerCase());
    else if (mental.lightlyReducedCognition) cogParts.push(t.lightlyReducedCog.toLowerCase());

    if (mental.moderateToSevereFatigue) fatigueParts.push(t.moderateSevereFatigue.toLowerCase());
    else if (mental.mildFatigue) fatigueParts.push(t.mildFatigue.toLowerCase());

    if (cogParts.length > 0 || fatigueParts.length > 0) {
      const parts = [];
      if (cogParts.length > 0) parts.push(cogParts.join(', '));
      if (fatigueParts.length > 0) parts.push(fatigueParts.join(', '));
      sections.push(capitalize(parts.join('; ')) + '.');
    } else {
      sections.push(t.cognitiveNormal + '.');
    }

    // Ambulation
    if (assistance === 'none') {
      sections.push(capitalize(`${t.walks} ${parsedDistance ?? t.unknown} ${t.meters} ${t.withoutAssistance}.`));
    } else {
      const assistLabel = assistanceLevels.find(a => a.id === assistance)?.label || assistance;
      sections.push(capitalize(assistLabel) + '.');
    }

    // EDSS
    sections.push(`EDSS: ${edss.toFixed(1)}`);

    return sections.join(' ');
  }, [visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, parsedDistance, edss, t, assistanceLevels]);

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
      hyperreflexiaLeft:false, hyperreflexiaRight:false,
      babinskiLeft:false, babinskiRight:false,
      clonusLeft:false, clonusRight:false,
      spasticGait:false, fatigability:false,
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
      vibRightArm: false, vibLeftArm: false, vibRightLeg: false, vibLeftLeg: false,
      ptSeverity: 'normal', ptCount: 0,
      ptRightArm: false, ptLeftArm: false, ptRightLeg: false, ptLeftLeg: false,
      jpSeverity: 'normal', jpCount: 0,
      jpRightArm: false, jpLeftArm: false, jpRightLeg: false, jpLeftLeg: false,
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
  const FSRowWrapper = ({ code, children }: { code: keyof typeof fsMeta; children: React.ReactNode }) => (
    <FSRow code={code} meta={fsMeta[code]} fs={fs} setFs={setFs} overrideLabel={t.overrideScore}>
      {children}
    </FSRow>
  );

  return (
    <>
      <style>{`html { overflow-anchor: none; }`}</style>
      <div className="min-h-screen w-full bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6" style={{ overflowAnchor: 'none' }}>
          <header className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium cursor-pointer"
              >
                <option value="en">English</option>
                <option value="no">Norsk</option>
              </select>
              <button onClick={resetAll} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium">{t.reset}</button>
            </div>
          </header>

          {/* V */}
          <FSRowWrapper code="V">
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.leftEyeAcuity}</div>
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
                <div className="text-sm font-medium">{t.rightEyeAcuity}</div>
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
              <div className="text-sm font-medium">{t.visualFieldDeficit}</div>
              <select className="w-full border rounded-lg p-1 text-sm" value={visual.visualFieldDeficit} onChange={(e)=>setVisual({...visual, visualFieldDeficit: e.target.value as VisualForm["visualFieldDeficit"]})}>
                <option value="none">{t.vfNone}</option>
                <option value="mild">{t.vfMild}</option>
                <option value="moderate">{t.vfModerate}</option>
                <option value="marked">{t.vfMarked}</option>
              </select>
            </div>
          </FSRowWrapper>

          {/* BS */}
          <FSRowWrapper code="BS">
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.eyeMotility}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.eyeMotilityLevel} onChange={(e)=>setBrainstem({...brainstem, eyeMotilityLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.eyeMotility0}</option>
                  <option value="1">{t.eyeMotility1}</option>
                  <option value="2">{t.eyeMotility2}</option>
                  <option value="3">{t.eyeMotility3}</option>
                  <option value="4">{t.eyeMotility4}</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t.nystagmus}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.nystagmusLevel} onChange={(e)=>setBrainstem({...brainstem, nystagmusLevel: Number(e.target.value) as 0|1|2|3})}>
                  <option value="0">{t.nystagmus0}</option>
                  <option value="1">{t.nystagmus1}</option>
                  <option value="2">{t.nystagmus2}</option>
                  <option value="3">{t.nystagmus3}</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t.facialSensibility}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.facialSensibilityLevel} onChange={(e)=>setBrainstem({...brainstem, facialSensibilityLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.facialSensibility0}</option>
                  <option value="1">{t.facialSensibility1}</option>
                  <option value="2">{t.facialSensibility2}</option>
                  <option value="3">{t.facialSensibility3}</option>
                  <option value="4">{t.facialSensibility4}</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t.facialSymmetry}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.facialSymmetryLevel} onChange={(e)=>setBrainstem({...brainstem, facialSymmetryLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.facialSymmetry0}</option>
                  <option value="1">{t.facialSymmetry1}</option>
                  <option value="2">{t.facialSymmetry2}</option>
                  <option value="3">{t.facialSymmetry3}</option>
                  <option value="4">{t.facialSymmetry4}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.hearing}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.hearingLevel} onChange={(e)=>setBrainstem({...brainstem, hearingLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.hearing0}</option>
                  <option value="1">{t.hearing1}</option>
                  <option value="2">{t.hearing2}</option>
                  <option value="3">{t.hearing3}</option>
                  <option value="4">{t.hearing4}</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t.dysarthria}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.dysarthriaLevel} onChange={(e)=>setBrainstem({...brainstem, dysarthriaLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.dysarthria0}</option>
                  <option value="1">{t.dysarthria1}</option>
                  <option value="2">{t.dysarthria2}</option>
                  <option value="3">{t.dysarthria3}</option>
                  <option value="4">{t.dysarthria4}</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t.dysphagia}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.dysphagiaLevel} onChange={(e)=>setBrainstem({...brainstem, dysphagiaLevel: Number(e.target.value) as 0|1|2|3|4})}>
                  <option value="0">{t.dysphagia0}</option>
                  <option value="1">{t.dysphagia1}</option>
                  <option value="2">{t.dysphagia2}</option>
                  <option value="3">{t.dysphagia3}</option>
                  <option value="4">{t.dysphagia4}</option>
                </select>
              </div>
            </div>
          </FSRowWrapper>

          {/* P — Registry-style */}
          <FSRowWrapper code="P">
            {/* Upper limbs table */}
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.upperLimbsMRC}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">{t.movement}</th>
                      <th className="py-1 pr-2">R</th>
                      <th className="py-1 pr-2">L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { keyR: 'shoulderAbductionR', keyL: 'shoulderAbductionL', labelKey: 'shoulderAbduction' as const },
                      { keyR: 'shoulderExternalRotationR', keyL: 'shoulderExternalRotationL', labelKey: 'shoulderExternalRotation' as const },
                      { keyR: 'elbowFlexionR', keyL: 'elbowFlexionL', labelKey: 'elbowFlexion' as const },
                      { keyR: 'elbowExtensionR', keyL: 'elbowExtensionL', labelKey: 'elbowExtension' as const },
                      { keyR: 'wristExtensionR', keyL: 'wristExtensionL', labelKey: 'wristExtension' as const },
                      { keyR: 'fingerAbductionR', keyL: 'fingerAbductionL', labelKey: 'fingerAbduction' as const },
                    ].map((row) => (
                      <tr key={row.labelKey} className="border-t">
                        <td className="py-1 pr-2">{t[row.labelKey]}</td>
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
              <div className="text-sm font-medium">{t.lowerLimbsMRC}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">{t.movement}</th>
                      <th className="py-1 pr-2">R</th>
                      <th className="py-1 pr-2">L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { keyR: 'hipFlexionR', keyL: 'hipFlexionL', labelKey: 'hipFlexion' as const },
                      { keyR: 'hipAbductionR', keyL: 'hipAbductionL', labelKey: 'hipAbduction' as const },
                      { keyR: 'kneeExtensionR', keyL: 'kneeExtensionL', labelKey: 'kneeExtension' as const },
                      { keyR: 'kneeFlexionR', keyL: 'kneeFlexionL', labelKey: 'kneeFlexion' as const },
                      { keyR: 'ankleDorsiflexionR', keyL: 'ankleDorsiflexionL', labelKey: 'ankleDorsiflexion' as const },
                      { keyR: 'anklePlantarflexionR', keyL: 'anklePlantarflexionL', labelKey: 'anklePlantarflexion' as const },
                    ].map((row) => (
                      <tr key={row.labelKey} className="border-t">
                        <td className="py-1 pr-2">{t[row.labelKey]}</td>
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
              <div className="pt-2 space-y-2">
                <div className="text-sm font-medium">{t.findings}</div>

                {/* Lateralized findings with L/R checkboxes */}
                {[
                  {label: t.hyperreflexia, leftKey: 'hyperreflexiaLeft' as const, rightKey: 'hyperreflexiaRight' as const},
                  {label: t.babinski, leftKey: 'babinskiLeft' as const, rightKey: 'babinskiRight' as const},
                  {label: t.clonus, leftKey: 'clonusLeft' as const, rightKey: 'clonusRight' as const}
                ].map(({label, leftKey, rightKey}) => (
                  <div key={leftKey} className="flex items-center gap-2 text-sm">
                    <span className="min-w-[100px]">{label}</span>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={pyramidal[leftKey]}
                        onChange={(e)=> setPyramidal(prev=> ({...prev, [leftKey]: e.target.checked}))}
                      />
                      <span>L</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={pyramidal[rightKey]}
                        onChange={(e)=> setPyramidal(prev=> ({...prev, [rightKey]: e.target.checked}))}
                      />
                      <span>R</span>
                    </label>
                  </div>
                ))}

                {/* Non-lateralized findings */}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pyramidal.spasticGait} onChange={(e)=> setPyramidal(prev=> ({...prev, spasticGait: e.target.checked}))} />
                  <span>{t.spasticGait}</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pyramidal.fatigability} onChange={(e)=> setPyramidal(prev=> ({...prev, fatigability: e.target.checked}))} />
                  <span>{t.fatigability}</span>
                </label>
              </div>
            </div>
          </FSRowWrapper>

          {/* C */}
          <FSRowWrapper code="C">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.minimalImpact}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.tremorOrAtaxiaOnCoordTests} onChange={(e)=>setCerebellar({ ...cerebellar, tremorOrAtaxiaOnCoordTests: e.target.checked })}/>{t.tremorAtaxiaCoord}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.rombergFallTendency} onChange={(e)=>setCerebellar({ ...cerebellar, rombergFallTendency: e.target.checked })}/>{t.rombergFall}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.lineWalkDifficulty} onChange={(e)=>setCerebellar({ ...cerebellar, lineWalkDifficulty: e.target.checked })}/>{t.tandemDifficulty}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.mildCerebellarSignsNoFunction} onChange={(e)=>setCerebellar({ ...cerebellar, mildCerebellarSignsNoFunction: e.target.checked })}/>{t.mildCerebellarSigns}</label>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.functionalImpact}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.limbAtaxiaAffectsFunction} onChange={(e)=>setCerebellar({ ...cerebellar, limbAtaxiaAffectsFunction: e.target.checked })}/>{t.limbAtaxiaFunction}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.gaitAtaxia} onChange={(e)=>setCerebellar({ ...cerebellar, gaitAtaxia: e.target.checked })}/>{t.gaitAtaxia}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.truncalAtaxiaEO} onChange={(e)=>setCerebellar({ ...cerebellar, truncalAtaxiaEO: e.target.checked })}/>{t.truncalAtaxia}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.ataxiaThreeOrFourLimbs} onChange={(e)=>setCerebellar({ ...cerebellar, ataxiaThreeOrFourLimbs: e.target.checked })}/>{t.ataxia34Limbs}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.needsAssistanceDueAtaxia} onChange={(e)=>setCerebellar({ ...cerebellar, needsAssistanceDueAtaxia: e.target.checked })}/>{t.needsAssistanceAtaxia}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cerebellar.inabilityCoordinatedMovements} onChange={(e)=>setCerebellar({ ...cerebellar, inabilityCoordinatedMovements: e.target.checked })}/>{t.unableCoordMovements}</label>
            </div>
          </FSRowWrapper>

          {/* S — Registry-style */}
          <FSRowWrapper code="S">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.vibration}</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">{t.severity}</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.vibSeverity} onChange={(e)=> setSensory({...sensory, vibSeverity: e.target.value as Severity})}>
                  <option value="normal">{t.sensNormal}</option>
                  <option value="mild">{t.sensMild}</option>
                  <option value="moderate">{t.sensModerate}</option>
                  <option value="marked">{t.sensMarked}</option>
                  <option value="absent">{t.sensAbsent}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibRightArm} onChange={(e)=> {
                    const updated = {...sensory, vibRightArm: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibLeftArm} onChange={(e)=> {
                    const updated = {...sensory, vibLeftArm: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibRightLeg} onChange={(e)=> {
                    const updated = {...sensory, vibRightLeg: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RL</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, vibLeftLeg: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LL</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.painTouch}</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">{t.severity}</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.ptSeverity} onChange={(e)=> setSensory({...sensory, ptSeverity: e.target.value as Severity})}>
                  <option value="normal">{t.sensNormal}</option>
                  <option value="mild">{t.sensMild}</option>
                  <option value="moderate">{t.sensModerate}</option>
                  <option value="marked">{t.sensMarked}</option>
                  <option value="absent">{t.sensAbsent}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptRightArm} onChange={(e)=> {
                    const updated = {...sensory, ptRightArm: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptLeftArm} onChange={(e)=> {
                    const updated = {...sensory, ptLeftArm: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptRightLeg} onChange={(e)=> {
                    const updated = {...sensory, ptRightLeg: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RL</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, ptLeftLeg: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LL</span>
                </label>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">{t.jointPosition}</div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm">{t.severity}</label>
                <select className="border rounded-lg p-1 text-sm" value={sensory.jpSeverity} onChange={(e)=> setSensory({...sensory, jpSeverity: e.target.value as Severity})}>
                  <option value="normal">{t.sensNormal}</option>
                  <option value="mild">{t.sensMild}</option>
                  <option value="moderate">{t.sensModerate}</option>
                  <option value="marked">{t.sensMarked}</option>
                  <option value="absent">{t.sensAbsent}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpRightArm} onChange={(e)=> {
                    const updated = {...sensory, jpRightArm: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpLeftArm} onChange={(e)=> {
                    const updated = {...sensory, jpLeftArm: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LA</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpRightLeg} onChange={(e)=> {
                    const updated = {...sensory, jpRightLeg: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>RL</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, jpLeftLeg: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>LL</span>
                </label>
              </div>
            </div>
          </FSRowWrapper>

          {/* BB */}
          <FSRowWrapper code="BB">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.bladderSymptoms}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.mildUrge} onChange={(e)=>setBB({ ...bb, mildUrge: e.target.checked })}/>{t.mildUrge}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.moderateUrge} onChange={(e)=>setBB({ ...bb, moderateUrge: e.target.checked })}/>{t.moderateUrge}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.rareIncontinence} onChange={(e)=>setBB({ ...bb, rareIncontinence: e.target.checked })}/>{t.rareIncontinence}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.frequentIncontinence} onChange={(e)=>setBB({ ...bb, frequentIncontinence: e.target.checked })}/>{t.frequentIncontinence}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.intermittentCatheterization} onChange={(e)=>setBB({ ...bb, intermittentCatheterization: e.target.checked })}/>{t.intermittentCath}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.permanentCatheter} onChange={(e)=>setBB({ ...bb, permanentCatheter: e.target.checked })}/>{t.permanentCath}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.lossBladderFunction} onChange={(e)=>setBB({ ...bb, lossBladderFunction: e.target.checked })}/>{t.lossBladderFunction}</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.bowelSymptoms}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.mildConstipation} onChange={(e)=>setBB({ ...bb, mildConstipation: e.target.checked })}/>{t.mildConstipation}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.moderateConstipation} onChange={(e)=>setBB({ ...bb, moderateConstipation: e.target.checked })}/>{t.moderateConstipation}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.severeConstipation} onChange={(e)=>setBB({ ...bb, severeConstipation: e.target.checked })}/>{t.severeConstipation}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.needsHelpForBowelMovement} onChange={(e)=>setBB({ ...bb, needsHelpForBowelMovement: e.target.checked })}/>{t.needsHelpBM}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.bowelIncontinenceWeekly} onChange={(e)=>setBB({ ...bb, bowelIncontinenceWeekly: e.target.checked })}/>{t.bowelIncontinenceWeekly}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bb.lossBowelFunction} onChange={(e)=>setBB({ ...bb, lossBowelFunction: e.target.checked })}/>{t.lossBowelFunction}</label>
            </div>
          </FSRowWrapper>

          {/* M */}
          <FSRowWrapper code="M">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.fatigue}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.mildFatigue} onChange={(e)=>setMental({ ...mental, mildFatigue: e.target.checked })}/>{t.mildFatigue}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.moderateToSevereFatigue} onChange={(e)=>setMental({ ...mental, moderateToSevereFatigue: e.target.checked })}/>{t.moderateSevereFatigue}</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.cognitiveFunction}</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.lightlyReducedCognition} onChange={(e)=>setMental({ ...mental, lightlyReducedCognition: e.target.checked })}/>{t.lightlyReducedCog}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.moderatelyReducedCognition} onChange={(e)=>setMental({ ...mental, moderatelyReducedCognition: e.target.checked })}/>{t.moderatelyReducedCog}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.markedlyReducedCognition} onChange={(e)=>setMental({ ...mental, markedlyReducedCognition: e.target.checked })}/>{t.markedlyReducedCog}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental.pronouncedDementia} onChange={(e)=>setMental({ ...mental, pronouncedDementia: e.target.checked })}/>{t.pronouncedDementia}</label>
            </div>
          </FSRowWrapper>

          {/* Ambulation + Result + Copy */}
          <section className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3 p-3 rounded-2xl bg-white border">
              <h2 className="text-xl font-semibold">{t.ambulation}</h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t.assistanceReq}</label>
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
                    <label className="block text-sm font-medium">{t.maxWalkDist}</label>
                    <input type="number" className="w-full rounded-xl border p-2" value={distance} min={0} max={2000} step={10} onChange={(e) => setDistance(e.target.value)} />
                    <div className="text-xs opacity-70">
                      {t.thresholds}
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
                <div>{t.rawFS}: {countFS(0)}×0, {countFS(1)}×1, {countFS(2)}×2, {countFS(3)}×3, {countFS(4)}×4, {countFS(5)}×5, {countFS(6)}×6</div>
                <div className="mt-1">{t.correctedFS}: {countCorrectedFS(0)}×0, {countCorrectedFS(1)}×1, {countCorrectedFS(2)}×2, {countCorrectedFS(3)}×3, {countCorrectedFS(4)}×4, {countCorrectedFS(5)}×5</div>
              </div>

              <div className="mt-6 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">{t.quickSummary}</div>
                <pre className="whitespace-pre-wrap text-xs">{summary}</pre>
                <div className="flex gap-2 mt-2">
                  <button onClick={copySummary} className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copied ? t.copied : t.copySummary}</button>
                  <button onClick={() => setShowExplainModal(true)} className="px-3 py-2 rounded-xl border text-sm hover:bg-blue-50 hover:border-blue-300">{t.explainEDSS}</button>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="mt-4 p-3 rounded-xl border border-amber-300 bg-amber-50">
                  <div className="text-xs font-semibold mb-2 text-amber-900">{t.warnings}</div>
                  <div className="space-y-2">
                    {warnings.map((warning, idx) => (
                      <div key={idx} className={`text-xs p-2 rounded-lg ${warning.type === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                        <span className="font-semibold">{warning.type === 'warning' ? '⚠️' : 'ℹ️'}</span> {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">{t.fullExamText}</div>
                <pre className="whitespace-pre-wrap text-xs">{examinationText}</pre>
                <button onClick={copyExamination} className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copiedExam ? t.copied : t.copyExamText}</button>
              </div>
            </section>
          </section>
        </div>
      </div>

      {/* Explain EDSS Modal */}
      {showExplainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowExplainModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t.edssCalculationExplanation}</h2>
              <button onClick={() => setShowExplainModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              {/* Step 1: Raw FS Scores */}
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="font-semibold text-sm mb-2">{t.step} 1: {t.rawFSScores}</div>
                <div className="text-sm">
                  V={fs.V}, BS={fs.BS}, P={fs.P}, C={fs.C}, S={fs.S}, BB={fs.BB}, M={fs.M}
                </div>
              </div>

              {/* Step 2: Corrected FS Scores */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="font-semibold text-sm mb-2">{t.step} 2: {t.correctedFSScores}</div>
                <div className="text-sm space-y-1">
                  {fs.V !== correctedFSForDisplay.V && (
                    <div>• {t.visual}: {fs.V} → {correctedFSForDisplay.V} ({t.correctedPerEDSSRules})</div>
                  )}
                  {fs.BB !== correctedFSForDisplay.BB && (
                    <div>• {t.bowelBladder}: {fs.BB} → {correctedFSForDisplay.BB} ({t.correctedPerEDSSRules})</div>
                  )}
                  {fs.V === correctedFSForDisplay.V && fs.BB === correctedFSForDisplay.BB && (
                    <div className="text-gray-600">{t.noCorrectionsNeeded}</div>
                  )}
                  <div className="mt-2 font-mono text-xs">
                    V={correctedFSForDisplay.V}, BS={correctedFSForDisplay.BS}, P={correctedFSForDisplay.P}, C={correctedFSForDisplay.C}, S={correctedFSForDisplay.S}, BB={correctedFSForDisplay.BB}, M={correctedFSForDisplay.M}
                  </div>
                </div>
              </div>

              {/* Step 3: FS-Based Score */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="font-semibold text-sm mb-2">{t.step} 3: {t.fsBasedScore}</div>
                <div className="text-sm mb-3">
                  {fsBasedEDSS ? (
                    <div className="font-mono text-lg font-bold">{fsBasedEDSS.edss.toFixed(1)}</div>
                  ) : (
                    <div className="text-gray-600">N/A (all FS = 0)</div>
                  )}
                </div>

                {/* FS Pattern Table */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="font-semibold text-xs mb-2">{t.fsPatternsTableTitle}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-purple-100">
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 0</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 1</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 2</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 3</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 4</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 5</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">FS 6</th>
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">EDSS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        <tr className={matchingFSRowIndex === 0 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1 text-center">{t.all}</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">0.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 1 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">1.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 2 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">1.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 3 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">2.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 4 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">2</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">2.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 5 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">3.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 6 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">3-4</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">3.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 7 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1-2</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">3.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 8 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">2</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">3.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 9 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">5</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">3.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 10 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 11 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">3-4</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 12 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;=3</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 13 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;0</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">2-4</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 14 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;5</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 15 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">5</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 16 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1-2</td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 17 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;=1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">4.5</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 18 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;=1</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">5.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 19 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;=2</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">5.0</td>
                        </tr>
                        <tr className={matchingFSRowIndex === 20 ? "bg-yellow-100 font-bold" : ""}>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center">&gt;=6</td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1"></td>
                          <td className="border border-purple-200 px-2 py-1 text-center font-mono">5.0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Step 4: Ambulation-Based Score */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-semibold text-sm mb-2">{t.step} 4: {t.ambulationBasedScore}</div>
                <div className="text-sm">
                  {ambulationBasedEDSS ? (
                    <>
                      <div className="font-mono text-lg font-bold">{ambulationBasedEDSS.edss.toFixed(1)}</div>
                      <div className="text-xs mt-1 text-gray-700">{translateRationale(ambulationBasedEDSS.rationale)}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-lg font-bold">0</div>
                      <div className="text-xs mt-1 text-gray-700">(walks ≥500m unaided)</div>
                    </>

                  )}
                </div>
              </div>

              {/* Step 5: Final Score Selection */}
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="font-semibold text-sm mb-2">{t.step} 5: {t.finalScoreSelection}</div>
                <div className="text-sm space-y-2">
                  <div className="bg-white p-3 rounded border">
                    <div className="font-mono text-xs mb-1">{t.maximumOfScores}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span>max({fsBasedEDSS?.edss.toFixed(1) || '0.0'}, {ambulationBasedEDSS?.edss.toFixed(1) || '0.0'})</span>
                      <span>=</span>
                      <span className="font-bold text-base">{edss.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Result */}
              <div className="p-4 rounded-xl bg-indigo-100 border-2 border-indigo-400">
                <div className="font-bold text-lg">{t.finalEDSS}: {edss.toFixed(1)}</div>
              </div>
            </div>

            <button onClick={() => setShowExplainModal(false)} className="mt-6 w-full px-4 py-3 rounded-xl border bg-gray-100 hover:bg-gray-200 font-semibold">
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}