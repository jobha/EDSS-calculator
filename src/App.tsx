import React, { useEffect, useMemo, useState } from "react";
import { Language, translations } from "./i18n/translations";
import type { AssistanceId, EyeAcuity, Severity } from "./types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm, CatheterisationLevel } from "./types/forms";
import { ARM_MUSCLES, LEG_MUSCLES } from "./types/forms";
import { formatEyeAcuity } from "./utils/formatting";
import { convertVisualForEDSS, convertBBForEDSS, correctedFS, FS_STEP_ROWS, type AmbulationResult, type FSColumn } from "./utils/edss";
import { assess, FS_KEYS, FS_MAX, type FSKey } from "./utils/assessment";
import { DEFAULT_STATE, decodeState, encodeState, type FormState } from "./utils/state";
import { FSRow } from "./components/FSRow";
import { Check, Choice, Toggles, highlight, levelOptions, splitLevel, type ChoiceOption } from "./components/controls";
import { validateEDSSInputs } from "./utils/validation";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const fsMeta: Record<FSKey, { label: string; max: number; help: string }> = {
  V: { label: "V (Visual)", max: FS_MAX.V, help: "Acuity, fields, scotoma; 0-6" },
  BS: { label: "BS (Brainstem)", max: FS_MAX.BS, help: "EOM, nystagmus, cranial nerves; 0-5" },
  P: { label: "P (Pyramidal)", max: FS_MAX.P, help: "Muscle strength + UMN/gait; 0-6" },
  C: { label: "C (Cerebellar)", max: FS_MAX.C, help: "Limb, gait and truncal ataxia; 0-5" },
  S: { label: "S (Sensory)", max: FS_MAX.S, help: "Superficial, vibration, position sense; 0-6" },
  BB: { label: "BB (Bowel/Bladder)", max: FS_MAX.BB, help: "Bladder, catheterisation, bowel; 0-6" },
  M: { label: "M (Cerebral)", max: FS_MAX.M, help: "Mentation/fatigue; 0-5" },
};

const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const EYE_ACUITIES: EyeAcuity[] = ["1.0", "0.68-0.99", "0.34-0.67", "0.21-0.33", "0.10-0.20", "lt_0.10"];
const FS_COLUMNS: FSColumn[] = ["0", "1", "2", "3", "4", "5"];

const shallowEqual = (a: object, b: object) => {
  const ra = a as Record<string, unknown>, rb = b as Record<string, unknown>;
  return Object.keys(rb).every((k) => ra[k] === rb[k]);
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const t = translations[language];

  // Set language from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('language') || params.get('lang');
    if (langParam) {
      const normalized = langParam.toLowerCase();
      if (normalized === 'norwegian' || normalized === 'no' || normalized === 'nb') {
        setLanguage('no');
      } else if (normalized === 'english' || normalized === 'en') {
        setLanguage('en');
      }
    }
  }, []);

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

  const [assistance, setAssistance] = useState<AssistanceId>(DEFAULT_STATE.assistance);
  const [distance, setDistance] = useState<string>(DEFAULT_STATE.walkingDistance);
  const [ambulationRestricted, setAmbulationRestricted] = useState<boolean>(DEFAULT_STATE.ambulationRestricted);

  const [overrides, setOverrides] = useState<FormState["overrides"]>(DEFAULT_STATE.overrides);

  const [visual, setVisual] = useState<VisualForm>(DEFAULT_STATE.visual);
  const [brainstem, setBrainstem] = useState<BrainstemForm>(DEFAULT_STATE.brainstem);
  const [pyramidal, setPyramidal] = useState<PyramidalForm>(DEFAULT_STATE.pyramidal);
  const [cerebellar, setCerebellar] = useState<CerebellarForm>(DEFAULT_STATE.cerebellar);
  const [sensory, setSensory] = useState<SensoryForm>(DEFAULT_STATE.sensory);
  const [bb, setBB] = useState<BowelBladderForm>(DEFAULT_STATE.bb);
  const [mental, setMental] = useState<MentalForm>(DEFAULT_STATE.mental);

  const [showExplainModal, setShowExplainModal] = useState(false);

  const formState: FormState = useMemo(
    () => ({ visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, walkingDistance: distance, ambulationRestricted, overrides }),
    [visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, distance, ambulationRestricted, overrides]
  );
  const assessment = useMemo(() => assess(formState), [formState]);
  const { fs, suggested, overridden, result } = assessment;
  const parsedDistance = assessment.distance;
  const edss = result.edss;

  const setOverride = (key: FSKey) => (value: number | null) => setOverrides((prev) => {
    const next = { ...prev };
    if (value === null) delete next[key]; else next[key] = value;
    return next;
  });
  const sectionForms: Record<FSKey, [object, object, () => void]> = {
    V: [visual, DEFAULT_STATE.visual, () => setVisual(DEFAULT_STATE.visual)],
    BS: [brainstem, DEFAULT_STATE.brainstem, () => setBrainstem(DEFAULT_STATE.brainstem)],
    P: [pyramidal, DEFAULT_STATE.pyramidal, () => setPyramidal(DEFAULT_STATE.pyramidal)],
    C: [cerebellar, DEFAULT_STATE.cerebellar, () => setCerebellar(DEFAULT_STATE.cerebellar)],
    S: [sensory, DEFAULT_STATE.sensory, () => setSensory(DEFAULT_STATE.sensory)],
    BB: [bb, DEFAULT_STATE.bb, () => setBB(DEFAULT_STATE.bb)],
    M: [mental, DEFAULT_STATE.mental, () => setMental(DEFAULT_STATE.mental)],
  };
  const fsRowProps = (code: FSKey) => ({
    code,
    meta: { ...fsMeta[code], help: t.fsHelp[code] },
    isNormal: shallowEqual(sectionForms[code][0], sectionForms[code][1]) && !overridden[code],
    onNormal: () => { sectionForms[code][2](); setOverride(code)(null); },
    value: fs[code],
    suggested: suggested[code],
    overridden: overridden[code],
    onOverride: setOverride(code),
    labels: { override: t.overrideScore, auto: t.fsAuto, manual: t.fsManual, reset: t.fsUseSuggested, allNormal: t.allNormal },
  });
  const fsWithOverride = (key: FSKey) => `${key} ${fs[key]}${overridden[key] ? ` [${t.fsManualShort.replace('{suggested}', String(suggested[key]))}]` : ''}`;

  // Comparison with a previous visit (saved form state)
  const [previousInput, setPreviousInput] = useState('');
  const previousAssessment = useMemo(() => {
    const state = previousInput.trim() ? decodeState(previousInput) : null;
    return state ? assess(state) : null;
  }, [previousInput]);
  const change = previousAssessment ? { delta: edss - previousAssessment.result.edss } : null;
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)}`;

  const describeAmbulation = (a: AmbulationResult) => `${t.ambulationScore} ${a.score} (${t.ambulationScoreDescriptions[a.score]})`;
  const rationale = [
    `${t.fsBasedScore} ${result.fsStep.edss.toFixed(1)}`,
    result.ambulation && `${describeAmbulation(result.ambulation)} → ${(result.ambulation.exclusive ? t.ambulationDefines : t.ambulationAtLeast).replace('{edss}', result.ambulation.minEDSS.toFixed(1))}`,
  ].filter(Boolean).join(' · ');

  // Validation warnings
  const warnings = useMemo(() =>
    validateEDSSInputs({ fs, ambulation: result.ambulation, distance: assistance === "none" ? parsedDistance : null, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, edss }, t),
    [fs, result, assistance, parsedDistance, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, edss, t]
  );

  const countFS = (grade: number) => Object.values(fs).filter((v) => v === grade).length;

  // Converted FS values for EDSS calculation
  const correctedFSForDisplay = useMemo(() => correctedFS(fs), [fs]);
  const countCorrectedFS = (grade: number) => Object.values(correctedFSForDisplay).filter((v) => v === grade).length;

  const severityText = (severity: Severity) => ({
    normal: t.sensNormal, signs: t.sensSigns, mild: t.sensMild, moderate: t.sensModerate, marked: t.sensMarked, absent: t.sensAbsent,
  })[severity];

  const cerebellarFindings = (): string[] => {
    const limbParts = ([
      [cerebellar.limbAtaxiaRightArm, t.rightArmAbbrev],
      [cerebellar.limbAtaxiaLeftArm, t.leftArmAbbrev],
      [cerebellar.limbAtaxiaRightLeg, t.rightLegAbbrev],
      [cerebellar.limbAtaxiaLeftLeg, t.leftLegAbbrev],
    ] as const).filter(([level]) => level > 0).map(([level, abbrev]) => `${abbrev} ${t.level} ${level}`);
    const graded = (level: number, text: string) => level > 0 && `${text} (${t.level} ${level})`;
    return [
      cerebellar.inabilityCoordinatedMovements && t.unableCoordMovementsText,
      limbParts.length > 0 && `${t.limbAtaxiaText} ${limbParts.join(', ')}`,
      graded(cerebellar.gaitAtaxia, t.gaitAtaxiaText),
      graded(cerebellar.truncalAtaxia, t.truncalAtaxiaText),
      graded(cerebellar.headTremor, t.headTremorText),
      cerebellar.tandemWalking === 1 && t.tandemImpairedText,
      cerebellar.tandemWalking === 2 && t.tandemNotPossibleText,
      graded(cerebellar.romberg, t.rombergText),
      graded(cerebellar.otherCerebellar, t.otherCerebellarText),
    ].filter((x): x is string => Boolean(x));
  };

  const bowelBladderFindings = (): string[] => [
    t.urinaryHesitancyShort[bb.urinaryHesitancy],
    t.urinaryUrgencyShort[bb.urinaryUrgency],
    t.catheterisationShort[bb.catheterisation],
    t.bowelDysfunctionShort[bb.bowelDysfunction],
  ].filter(Boolean);

  const mentalFindings = (): string[] => [
    mental.pronouncedDementia && t.pronouncedDementiaShort,
    mental.markedlyReducedCognition && t.markedlyReducedCogShort,
    mental.moderatelyReducedCognition && t.moderatelyReducedCogShort,
    mental.lightlyReducedCognition && t.lightlyReducedCogShort,
    mental.signsOnlyCognition && t.signsOnlyCogShort,
    mental.moderateToSevereFatigue && t.moderateSevereFatigueShort,
    mental.mildFatigue && t.mildFatigueShort,
  ].filter((x): x is string => Boolean(x));

  const visualExtras = (): string[] => {
    const vfText = visual.visualFieldDeficit === 'mild' ? t.mild : visual.visualFieldDeficit === 'moderate' ? t.moderate : t.marked;
    return [
      visual.visualFieldDeficit !== 'none' && `${vfText} ${t.visualFieldDeficitText}`,
      visual.scotoma > 0 && t.scotomaShort[visual.scotoma],
      visual.discPallor && t.discPallorShort,
    ].filter((x): x is string => Boolean(x));
  };

  const walkingRestrictedApplies = assistance === 'none' && ambulationRestricted && (parsedDistance === null || parsedDistance >= 500);

  // Summary (multi-line, copy-ready)
  const summary = useMemo(() => {
    const rawDistance = Number(distance);
    const ambFinding = assistance === 'none'
      ? (Number.isFinite(rawDistance) && rawDistance > 2000 ? t.walkingDistanceNotLimited : parsedDistance != null ? `${t.unaided} ${parsedDistance} m` : `${t.unaided} (n/a)`)
        + (walkingRestrictedApplies ? `, ${t.walkingRangeRestricted}` : '')
      : (assistanceLevels.find(a=>a.id===assistance)?.label ?? String(assistance));

    // Pyramidal summary
    const muscles = [...ARM_MUSCLES, ...LEG_MUSCLES].flatMap((m) => [
      { val: pyramidal[`${m}R`], name: t.muscles[m], side: t.rightAbbrev },
      { val: pyramidal[`${m}L`], name: t.muscles[m], side: t.leftAbbrev },
    ]);
    const weaknessText = muscles.filter(m => m.val < 5).map(m => `${m.name} ${m.side} ${t.grade} ${m.val}`).join(', ');

    // UMN signs
    const sidesText = (label: string, left: boolean, right: boolean) => {
      const sides = [right && t.rightAbbrev, left && t.leftAbbrev].filter(Boolean);
      return sides.length > 0 ? `${label} ${sides.join('+')}` : '';
    };

    const pFlags = [
      weaknessText,
      sidesText(t.hyperreflexia.toLowerCase(), pyramidal.hyperreflexiaLeft, pyramidal.hyperreflexiaRight),
      sidesText(t.babinski, pyramidal.babinskiLeft, pyramidal.babinskiRight),
      sidesText(t.clonus.toLowerCase(), pyramidal.clonusLeft, pyramidal.clonusRight),
      pyramidal.spasticGait && t.spasticGaitText,
      pyramidal.fatigability && t.fatigability.toLowerCase(),
    ].filter(Boolean).join(', ');

    // Visual summary
    const vCorrected = convertVisualForEDSS(fs.V);
    const acuityAbnormal = visual.leftEyeAcuity !== "1.0" || visual.rightEyeAcuity !== "1.0";
    const vFindings = [
      `${t.rightAbbrev}: ${formatEyeAcuity(visual.rightEyeAcuity)}, ${t.leftAbbrev}: ${formatEyeAcuity(visual.leftEyeAcuity)}`,
      ...visualExtras(),
    ].join(', ');
    const vAbnormal = acuityAbnormal || visualExtras().length > 0;

    // Brainstem summary
    const nystagmusText = brainstem.nystagmus === "spontaneous" ? t.spontaneousNystagmus :
                          brainstem.nystagmus === "clear" ? t.clearNystagmus :
                          brainstem.nystagmus === "mild" ? t.mildNystagmus : '';

    // Format sides with levels, right first (e.g., "R:3+L:2")
    const levelSides = (left: number, right: number) => [
      right > 0 && `${t.rightAbbrev}:${right}`,
      left > 0 && `${t.leftAbbrev}:${left}`,
    ].filter(Boolean).join('+');
    const facialSensSides = levelSides(brainstem.facialSensLeft, brainstem.facialSensRight);
    const facialSymSides = levelSides(brainstem.facialSymLeft, brainstem.facialSymRight);
    const hearingSides = levelSides(brainstem.hearingLeft, brainstem.hearingRight);

    const bsFindings = [
      brainstem.eyeMotilityLevel > 0 && `${t.eyeMotilityImpairment} ${brainstem.eyeMotilityLevel}`,
      nystagmusText,
      brainstem.ino && t.ino,
      facialSensSides && `${t.facialSens} ${facialSensSides}`,
      facialSymSides && `${t.facialSym} ${facialSymSides}`,
      hearingSides && `${t.hearingImpairment} ${hearingSides}`,
      brainstem.dysarthriaLevel > 0 && `${t.dysarthria} ${brainstem.dysarthriaLevel}`,
      brainstem.dysphagiaLevel > 0 && `${t.dysphagia} ${brainstem.dysphagiaLevel}`,
      brainstem.otherCranialNerves > 0 && `${t.otherCranialNerveDeficit} ${brainstem.otherCranialNerves}`,
    ].filter(Boolean).join(', ');

    // Sensory summary
    const sFindings = [
      sensory.vibSeverity !== 'normal' && sensory.vibCount > 0 && `${t.vibration} ${severityText(sensory.vibSeverity)} ${sensory.vibCount} ${t.limbs}`,
      sensory.ptSeverity !== 'normal' && sensory.ptCount > 0 && `${t.painTouch} ${severityText(sensory.ptSeverity)} ${sensory.ptCount} ${t.limbs}`,
      sensory.jpSeverity !== 'normal' && sensory.jpCount > 0 && `${t.jointPosition} ${severityText(sensory.jpSeverity)} ${sensory.jpCount} ${t.limbs}`,
    ].filter(Boolean).join(', ');

    const bbCorrected = convertBBForEDSS(fs.BB);
    const withFindings = (findings: string) => findings ? ` (${findings})` : '';

    const lines = [
      `EDSS ${edss.toFixed(1)}`,
      `${t.ambulationScore} ${result.ambulation?.score ?? 0} (${ambFinding})`,
      `${fsWithOverride('P')}${withFindings(pFlags)}`,
      `${fsWithOverride('V')}${fs.V !== vCorrected ? ` (${t.corrected}: ${vCorrected})` : ''}${vAbnormal ? ` (${vFindings})` : ''}`,
      `${fsWithOverride('BS')}${withFindings(bsFindings)}`,
      `${fsWithOverride('C')}${withFindings(cerebellarFindings().join(', '))}`,
      `${fsWithOverride('S')}${withFindings(sFindings)}`,
      `${fsWithOverride('BB')}${fs.BB !== bbCorrected ? ` (${t.corrected}: ${bbCorrected})` : ''}${withFindings(bowelBladderFindings().join(', '))}`,
      `${fsWithOverride('M')}${withFindings(mentalFindings().join(', '))}`,
    ];
    if (previousAssessment && change) {
      lines.push(`${t.previousVisit}: EDSS ${previousAssessment.result.edss.toFixed(1)} → ${edss.toFixed(1)} (${signed(change.delta)})`);
    }
    return lines.join('\n');
  }, [edss, result, fs, suggested, overridden, previousAssessment, change, assistance, distance, parsedDistance, walkingRestrictedApplies, pyramidal, visual, brainstem, cerebellar, sensory, bb, mental, t]);

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
    const bothEyes10 = visual.leftEyeAcuity === "1.0" && visual.rightEyeAcuity === "1.0";
    const vExtras = visualExtras();
    if (bothEyes10 && vExtras.length === 0) {
      sections.push(t.visualExamNormal + '.');
    } else if (bothEyes10) {
      sections.push(`${t.visualAcuity} ${t.sensNormal.toLowerCase()}, ${vExtras.join(', ')}.`);
    } else {
      const acuityText = `${t.rightEye} ${formatEyeAcuity(visual.rightEyeAcuity)}, ${t.leftEye} ${formatEyeAcuity(visual.leftEyeAcuity)}`;
      sections.push([acuityText, ...vExtras].join(', ') + '.');
    }

    // Brainstem
    const bsParts: string[] = [];
    if (brainstem.eyeMotilityLevel > 0) bsParts.push(`${t.eyeMotilityImpairment} (${t.level} ${brainstem.eyeMotilityLevel})`);

    const nystagmusExamText = brainstem.nystagmus === "spontaneous" ? t.spontaneousNystagmus :
                              brainstem.nystagmus === "clear" ? t.clearNystagmus :
                              brainstem.nystagmus === "mild" ? t.mildNystagmus : '';
    if (nystagmusExamText) bsParts.push(nystagmusExamText);

    if (brainstem.ino) bsParts.push(t.inoPresent);

    const sideLevels = (left: number, right: number) => [
      right > 0 && `${t.rightAbbrev} (${t.level} ${right})`,
      left > 0 && `${t.leftAbbrev} (${t.level} ${left})`,
    ].filter(Boolean);
    const facialSensExamSides = sideLevels(brainstem.facialSensLeft, brainstem.facialSensRight);
    if (facialSensExamSides.length > 0) bsParts.push(`${t.facialSensibilityDeficit} ${facialSensExamSides.join(', ')}`);
    const facialSymExamSides = sideLevels(brainstem.facialSymLeft, brainstem.facialSymRight);
    if (facialSymExamSides.length > 0) bsParts.push(`${t.facialAsymmetry} ${facialSymExamSides.join(', ')}`);
    const hearingExamSides = sideLevels(brainstem.hearingLeft, brainstem.hearingRight);
    if (hearingExamSides.length > 0) bsParts.push(`${t.hearingImpairment} ${hearingExamSides.join(', ')}`);

    if (brainstem.dysarthriaLevel > 0) bsParts.push(`${t.dysarthria.toLowerCase()} (${t.level} ${brainstem.dysarthriaLevel})`);
    if (brainstem.dysphagiaLevel > 0) bsParts.push(`${t.dysphagia.toLowerCase()} (${t.level} ${brainstem.dysphagiaLevel})`);
    if (brainstem.otherCranialNerves > 0) bsParts.push(`${t.otherCranialNerveDeficit} (${t.level} ${brainstem.otherCranialNerves})`);
    if (bsParts.length > 0) {
      sections.push(capitalize(bsParts.join(', ')) + '.');
    } else {
      sections.push(t.brainstemExamNormal + '.');
    }

    // Pyramidal - list specific weakness findings with new narrative format
    const weaknessFindings: string[] = [];

    // "grade X for [side] [muscle group]", or "grade X for [muscle group] bilaterally"
    for (const m of [...ARM_MUSCLES, ...LEG_MUSCLES]) {
      const r = pyramidal[`${m}R`], l = pyramidal[`${m}L`];
      const name = t.muscles[m].toLowerCase();
      if (r < 5 && r === l) {
        weaknessFindings.push(`${t.grade} ${r} ${t.for} ${name} ${t.bilaterally}`);
      } else {
        if (r < 5) weaknessFindings.push(`${t.grade} ${r} ${t.for} ${t.right} ${name}`);
        if (l < 5) weaknessFindings.push(`${t.grade} ${l} ${t.for} ${t.left} ${name}`);
      }
    }

    const umnSigns: string[] = [];

    // Lateralized UMN signs
    const sideWord = (left: boolean, right: boolean) => left && right ? t.bilaterally : right ? t.right : t.left;
    if (pyramidal.hyperreflexiaLeft || pyramidal.hyperreflexiaRight) {
      umnSigns.push(`${t.hyperreflexia.toLowerCase()} ${sideWord(pyramidal.hyperreflexiaLeft, pyramidal.hyperreflexiaRight)}`);
    }
    if (pyramidal.babinskiLeft || pyramidal.babinskiRight) {
      umnSigns.push(`${t.positiveBarbinskiSign} ${sideWord(pyramidal.babinskiLeft, pyramidal.babinskiRight)}`);
    }
    if (pyramidal.clonusLeft || pyramidal.clonusRight) {
      umnSigns.push(`${t.clonus.toLowerCase()} ${sideWord(pyramidal.clonusLeft, pyramidal.clonusRight)}`);
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
      sections.push(allFindings.join(', ') + '.');
    } else {
      sections.push(t.withFullStrength + '.');
    }

    // Cerebellar
    const cParts = cerebellarFindings();
    sections.push(cParts.length > 0 ? capitalize(cParts.join(', ')) + '.' : t.cerebellarExamNormal + '.');

    // Sensory
    const sParts: string[] = [];
    const getLimbList = (ra: boolean, la: boolean, rl: boolean, ll: boolean): string => {
      const limbs: string[] = [];
      if (ra) limbs.push(t.rightArm);
      if (la) limbs.push(t.leftArm);
      if (rl) limbs.push(t.rightLeg);
      if (ll) limbs.push(t.leftLeg);
      return joinWithAnd(limbs, t.and);
    };

    if (sensory.vibSeverity !== 'normal' && sensory.vibCount > 0) {
      sParts.push(`${severityText(sensory.vibSeverity)} ${t.vibrationSenseDeficit} ${getLimbList(sensory.vibRightArm, sensory.vibLeftArm, sensory.vibRightLeg, sensory.vibLeftLeg)}`);
    }
    if (sensory.ptSeverity !== 'normal' && sensory.ptCount > 0) {
      sParts.push(`${severityText(sensory.ptSeverity)} ${t.painTouchDeficit} ${getLimbList(sensory.ptRightArm, sensory.ptLeftArm, sensory.ptRightLeg, sensory.ptLeftLeg)}`);
    }
    if (sensory.jpSeverity !== 'normal' && sensory.jpCount > 0) {
      sParts.push(`${severityText(sensory.jpSeverity)} ${t.jointPositionDeficit} ${getLimbList(sensory.jpRightArm, sensory.jpLeftArm, sensory.jpRightLeg, sensory.jpLeftLeg)}`);
    }
    sections.push(sParts.length > 0 ? capitalize(sParts.join(', ')) + '.' : t.sensoryExaminationNormal + '.');

    // Bowel/Bladder
    const bbParts = bowelBladderFindings();
    sections.push(bbParts.length > 0 ? capitalize(bbParts.join(', ')) + '.' : t.bowelBladderNormal + '.');

    // Cerebral
    const mParts = mentalFindings();
    sections.push(mParts.length > 0 ? capitalize(mParts.join(', ')) + '.' : t.cognitiveNormal + '.');

    // Ambulation
    if (assistance === 'none') {
      const rawDistance = Number(distance);
      const restricted = walkingRestrictedApplies ? `, ${t.walkingRangeRestricted}` : '';
      if (Number.isFinite(rawDistance) && rawDistance > 2000) {
        sections.push(capitalize(`${t.walkingDistanceNotLimited}${restricted}.`));
      } else {
        sections.push(capitalize(`${t.walks} ${parsedDistance ?? t.unknown} ${t.meters} ${t.withoutAssistance}${restricted}.`));
      }
    } else {
      const assistLabel = assistanceLevels.find(a => a.id === assistance)?.label || assistance;
      sections.push(capitalize(assistLabel) + '.');
    }

    // EDSS
    sections.push(`EDSS: ${edss.toFixed(1)}`);

    return sections.join(' ');
  }, [visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, distance, parsedDistance, walkingRestrictedApplies, edss, t]);

  const [copied, setCopied] = useState(false);
  const [copiedExam, setCopiedExam] = useState(false);

  // State export/import
  const [copiedState, setCopiedState] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // Generate encoded state string (compressed)
  const stateString = useMemo(() => {
    try {
      return encodeState(formState);
    } catch {
      return '';
    }
  }, [formState]);

  async function copyText(text: string, setDone: (done: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }

  const copySummary = () => copyText(summary, setCopied);
  const copyExamination = () => copyText(examinationText, setCopiedExam);
  const copyState = () => copyText(stateString, setCopiedState);

  function applyState(state: FormState) {
    setVisual(state.visual);
    setBrainstem(state.brainstem);
    setPyramidal(state.pyramidal);
    setCerebellar(state.cerebellar);
    setSensory(state.sensory);
    setBB(state.bb);
    setMental(state.mental);
    setAssistance(state.assistance);
    setDistance(state.walkingDistance);
    setAmbulationRestricted(state.ambulationRestricted);
    setOverrides(state.overrides);
  }

  function restoreState() {
    setRestoreError('');
    const state = decodeState(restoreInput);
    if (!state) {
      setRestoreError(t.restoreError);
      return;
    }
    applyState(state);
    setRestoreInput('');
  }

  function resetAll() {
    applyState(DEFAULT_STATE);
  }

  const setCerebellarLevel = (key: keyof CerebellarForm) => (value: number) => setCerebellar((prev) => ({ ...prev, [key]: value }));
  const setBrainstemLevel = (key: keyof BrainstemForm) => (value: number) => setBrainstem((prev) => ({ ...prev, [key]: value }));
  const setBBLevel = (key: keyof BowelBladderForm) => (value: number) => setBB((prev) => ({ ...prev, [key]: value }));

  // Cerebral FS inputs are stored as exclusive flags; the form shows them as levels
  const cognitionKeys = ['signsOnlyCognition', 'lightlyReducedCognition', 'moderatelyReducedCognition', 'markedlyReducedCognition', 'pronouncedDementia'] as const;
  const fatigueKeys = ['mildFatigue', 'moderateToSevereFatigue'] as const;
  const levelOf = (keys: readonly (keyof MentalForm)[]) => keys.findIndex((k) => mental[k]) + 1;
  const setLevel = (keys: readonly (keyof MentalForm)[]) => (level: number) =>
    setMental((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k, i) => [k, i + 1 === level])) }));

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    // Update URL parameter without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('language', newLang === 'no' ? 'norwegian' : 'english');
    window.history.pushState({}, '', url.toString());
  }

  // ---------- UI ----------
  const acuityOptions: ChoiceOption<EyeAcuity>[] = EYE_ACUITIES.map((a) => ({ value: a, short: formatEyeAcuity(a) }));
  const visualFieldOptions: ChoiceOption<VisualForm["visualFieldDeficit"]>[] = ([
    ["none", t.vfNone], ["mild", t.vfMild], ["moderate", t.vfModerate], ["marked", t.vfMarked],
  ] as const).map(([value, label], i) => ({ value, ...splitLevel(label, String(i)) }));
  const nystagmusOptions: ChoiceOption<BrainstemForm["nystagmus"]>[] = ([
    ["none", t.nystagmusNone], ["mild", t.nystagmusMild], ["clear", t.nystagmusClear], ["spontaneous", t.nystagmusSpontaneous],
  ] as const).map(([value, label], i) => ({ value, ...splitLevel(label, String(i)) }));
  const catheterisationOptions: ChoiceOption<CatheterisationLevel>[] = (Object.keys(t.catheterisationLevels) as CatheterisationLevel[])
    .map((value) => ({ value, short: t.catheterisationLevels[value] }));
  const cognitionOptions: ChoiceOption<number>[] = [
    { value: 0, short: "0" },
    ...[t.signsOnlyCog, t.lightlyReducedCog, t.moderatelyReducedCog, t.markedlyReducedCog, t.pronouncedDementia]
      .map((description, i) => ({ value: i + 1, short: String(i + 1), description })),
  ];
  const fatigueOptions: ChoiceOption<number>[] = [
    { value: 0, short: "0" },
    { value: 1, short: "1", description: t.mildFatigue },
    { value: 2, short: "2–3", description: t.moderateSevereFatigue },
  ];

  const LIMBS = [["RightArm", t.rightArmAbbrev], ["LeftArm", t.leftArmAbbrev], ["RightLeg", t.rightLegAbbrev], ["LeftLeg", t.leftLegAbbrev]] as const;
  type SensoryPrefix = "pt" | "vib" | "jp";
  const sensoryField = (prefix: SensoryPrefix, field: string) => (sensory as unknown as Record<string, unknown>)[`${prefix}${field}`];
  const sensoryModalities: { prefix: SensoryPrefix; label: string; options: ChoiceOption<Severity>[] }[] = [
    { prefix: "pt", label: t.painTouch, options: (["signs", "mild", "moderate", "marked", "absent"] as const).map((k) => ({ value: k, ...splitLevel(t.ptOptions[k], k) })) },
    { prefix: "vib", label: t.vibration, options: (["mild", "moderate", "marked"] as const).map((k) => ({ value: k, ...splitLevel(t.vibOptions[k], k) })) },
    { prefix: "jp", label: t.jointPosition, options: (["mild", "moderate", "marked"] as const).map((k) => ({ value: k, ...splitLevel(t.jpOptions[k], k) })) },
  ];
  const setSensorySeverity = (prefix: SensoryPrefix, severity: Severity) => setSensory((prev) => ({
    ...prev,
    [`${prefix}Severity`]: severity,
    // Clearing the severity clears the affected limbs
    ...(severity === "normal" ? { [`${prefix}Count`]: 0, ...Object.fromEntries(LIMBS.map(([limb]) => [`${prefix}${limb}`, false])) } : {}),
  }));
  const setSensoryLimb = (prefix: SensoryPrefix, limb: string, checked: boolean) => setSensory((prev) => {
    const next = { ...prev, [`${prefix}${limb}`]: checked } as unknown as Record<string, unknown>;
    next[`${prefix}Count`] = LIMBS.filter(([l]) => next[`${prefix}${l}`]).length;
    return next as unknown as SensoryForm;
  });

  // Several graded selections under one label, e.g. right/left side or the four limbs
  const multiChoice = (label: string, entries: readonly (readonly [string, number, (value: number) => void])[], labels: readonly string[]) => {
    const options = levelOptions(labels);
    const abnormal = entries.filter(([, value]) => value > 0);
    return (
      <div className={`space-y-1 ${highlight(abnormal.length > 0)}`}>
        <div className="text-sm font-medium">{label}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {entries.map(([side, value, onChange]) => (
            <div key={side} className="flex items-center gap-2">
              <span className="text-xs font-semibold w-9 shrink-0">{side}</span>
              <Choice value={value} options={options} onChange={onChange} showDescription={false} />
            </div>
          ))}
        </div>
        {abnormal.map(([side, value]) => (
          <div key={side} className="text-xs text-blue-950"><span className="font-semibold">{side}:</span> {options[value].description}</div>
        ))}
      </div>
    );
  };

  const strengthOptions: ChoiceOption<number>[] = [5, 4, 3, 2, 1, 0].map((v) => ({ value: v, short: String(v) }));
  const strengthTable = (title: string, muscles: readonly (typeof ARM_MUSCLES[number] | typeof LEG_MUSCLES[number])[]) => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-[auto_auto] sm:grid-cols-[minmax(9rem,1fr)_auto_auto] gap-x-2 sm:gap-x-4 gap-y-1 items-center">
        <div className="hidden sm:block text-xs opacity-60">{t.movement}</div>
        <div className="text-xs font-semibold">{t.rightAbbrev}</div>
        <div className="text-xs font-semibold">{t.leftAbbrev}</div>
        {muscles.map((m) => {
          const weak = pyramidal[`${m}R`] < 5 || pyramidal[`${m}L`] < 5;
          return (
            <React.Fragment key={m}>
              <div className={`col-span-2 sm:col-span-1 text-sm pt-1 sm:pt-0 ${weak ? "font-semibold text-blue-950" : ""}`}>{t.muscles[m]}</div>
              {(["R", "L"] as const).map((side) => (
                <Choice
                  key={side}
                  compact
                  value={pyramidal[`${m}${side}`]}
                  options={strengthOptions}
                  normal={5}
                  showDescription={false}
                  onChange={(v) => setPyramidal((prev) => ({ ...prev, [`${m}${side}`]: v }))}
                />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const fsChips = (
    <div className="flex flex-wrap gap-1.5">
      {FS_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => scrollToSection(`fs-${k}`)}
          className={`rounded-lg border px-2 py-1 text-xs font-mono hover:bg-gray-100 ${overridden[k] ? 'border-amber-400 bg-amber-50' : fs[k] > 0 ? 'border-blue-300 bg-blue-50' : 'bg-white'}`}
          title={overridden[k] ? t.fsManual.replace('{suggested}', String(suggested[k])) : undefined}
        >
          {k} <span className="font-bold">{fs[k]}</span>
          {correctedFSForDisplay[k] !== fs[k] && <span className="opacity-60">→{correctedFSForDisplay[k]}</span>}
        </button>
      ))}
      <button type="button" onClick={() => scrollToSection('ambulation')} className={`rounded-lg border px-2 py-1 text-xs font-mono hover:bg-gray-100 ${result.ambulation ? 'border-blue-300 bg-blue-50' : 'bg-white'}`}>
        {t.ambulationShort} <span className="font-bold">{result.ambulation?.score ?? 0}</span>
      </button>
    </div>
  );

  const changeBadge = change && (
    <span className="text-xs font-semibold rounded-lg px-2 py-0.5 bg-gray-100 text-gray-800" title={t.previousVisit}>{signed(change.delta)}</span>
  );

  const resultPanel = (
    <div className="space-y-3">
      <section className="p-4 rounded-2xl bg-white shadow-sm border space-y-3">
        <div className="flex items-baseline gap-3">
          <div className="text-5xl font-black tabular-nums">{edss.toFixed(1)}</div>
          <div className="text-sm uppercase tracking-wide opacity-60">EDSS</div>
          {changeBadge}
        </div>
        <div className="text-sm opacity-80">{rationale}</div>
        {fsChips}
        <div className="flex flex-wrap gap-2">
          <button onClick={copySummary} className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-700">{copied ? t.copied : t.copySummary}</button>
          <button onClick={copyExamination} className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copiedExam ? t.copied : t.copyExamText}</button>
          <button onClick={() => setShowExplainModal(true)} className="px-3 py-2 rounded-xl border text-sm hover:bg-blue-50 hover:border-blue-300">{t.explainEDSS}</button>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="p-3 rounded-xl border border-amber-300 bg-amber-50">
          <div className="text-xs font-semibold mb-2 text-amber-900">{t.warnings}</div>
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div key={idx} className={`text-xs p-2 rounded-lg ${warning.type === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                <span className="font-semibold">{warning.type === 'warning' ? '⚠️' : 'ℹ️'}</span> {warning.message}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="p-3 rounded-xl border bg-white">
        <div className="text-xs font-semibold mb-2">{t.quickSummary}</div>
        <pre className="whitespace-pre-wrap text-xs">{summary}</pre>
      </section>

      <section className="p-3 rounded-xl border bg-white">
        <div className="text-xs font-semibold mb-2">{t.fullExamText}</div>
        <pre className="whitespace-pre-wrap text-xs">{examinationText}</pre>
      </section>

      <div className="text-xs opacity-60 px-1 space-y-0.5">
        <div>{t.rawFS}: {countFS(0)}×0, {countFS(1)}×1, {countFS(2)}×2, {countFS(3)}×3, {countFS(4)}×4, {countFS(5)}×5, {countFS(6)}×6</div>
        <div>{t.correctedFS}: {countCorrectedFS(0)}×0, {countCorrectedFS(1)}×1, {countCorrectedFS(2)}×2, {countCorrectedFS(3)}×3, {countCorrectedFS(4)}×4, {countCorrectedFS(5)}×5, {countCorrectedFS(6)}×6</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium cursor-pointer"
              >
                <option value="en">English</option>
                <option value="no">Norsk</option>
              </select>
              <button onClick={resetAll} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium">{t.reset}</button>
            </div>
          </header>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6 lg:items-start">
            <main className="space-y-4 min-w-0">
              {/* Sticky live result (narrow screens; wide screens use the side panel) */}
              <div className="lg:hidden sticky top-2 z-40 rounded-xl border bg-white/95 backdrop-blur shadow-sm px-3 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide opacity-60">EDSS</span>
                  <span className="text-3xl font-black tabular-nums">{edss.toFixed(1)}</span>
                  {changeBadge}
                  <button onClick={copySummary} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700">
                    {copied ? t.copied : t.copySummary}
                  </button>
                </div>
                {fsChips}
              </div>

              {/* V */}
              <FSRow {...fsRowProps("V")}>
                <div className="space-y-4">
                  <Choice label={t.rightEyeAcuity} value={visual.rightEyeAcuity} options={acuityOptions} onChange={(v) => setVisual((prev) => ({ ...prev, rightEyeAcuity: v }))} />
                  <Choice label={t.leftEyeAcuity} value={visual.leftEyeAcuity} options={acuityOptions} onChange={(v) => setVisual((prev) => ({ ...prev, leftEyeAcuity: v }))} />
                </div>
                <div className="space-y-4">
                  <Choice label={t.visualFieldDeficit} value={visual.visualFieldDeficit} options={visualFieldOptions} onChange={(v) => setVisual((prev) => ({ ...prev, visualFieldDeficit: v }))} />
                  <Choice label={t.scotoma} value={visual.scotoma} options={levelOptions(t.scotomaLevels)} onChange={(v) => setVisual((prev) => ({ ...prev, scotoma: v as VisualForm["scotoma"] }))} />
                  <Check label={t.discPallor} checked={visual.discPallor} onChange={(checked) => setVisual((prev) => ({ ...prev, discPallor: checked }))} />
                </div>
              </FSRow>

              {/* BS */}
              <FSRow {...fsRowProps("BS")}>
                <div className="space-y-4">
                  <Choice label={t.eyeMotility} value={brainstem.eyeMotilityLevel} options={levelOptions([t.eyeMotility0, t.eyeMotility1, t.eyeMotility2, t.eyeMotility3, t.eyeMotility4])} onChange={setBrainstemLevel('eyeMotilityLevel')} />
                  <Choice label={t.nystagmus} value={brainstem.nystagmus} options={nystagmusOptions} onChange={(v) => setBrainstem((prev) => ({ ...prev, nystagmus: v }))} />
                  <Check label={t.ino} checked={brainstem.ino} onChange={(checked) => setBrainstem((prev) => ({ ...prev, ino: checked }))} />
                  <Choice label={t.dysarthria} value={brainstem.dysarthriaLevel} options={levelOptions(t.dysarthriaLevels)} onChange={setBrainstemLevel('dysarthriaLevel')} />
                  <Choice label={t.dysphagia} value={brainstem.dysphagiaLevel} options={levelOptions(t.dysphagiaLevels)} onChange={setBrainstemLevel('dysphagiaLevel')} />
                  <Choice label={t.otherCranialNerves} value={brainstem.otherCranialNerves} options={levelOptions(t.otherCranialNervesLevels)} onChange={setBrainstemLevel('otherCranialNerves')} />
                </div>
                <div className="space-y-4">
                  {([
                    [t.facialSensibility, 'facialSensRight', 'facialSensLeft', [t.facialSensibility0, t.facialSensibility1, t.facialSensibility2, t.facialSensibility3, t.facialSensibility4]],
                    [t.facialSymmetry, 'facialSymRight', 'facialSymLeft', [t.facialSymmetry0, t.facialSymmetry1, t.facialSymmetry2, t.facialSymmetry3, t.facialSymmetry4]],
                    [t.hearing, 'hearingRight', 'hearingLeft', [t.hearing0, t.hearing1, t.hearing2, t.hearing3, t.hearing4]],
                  ] as const).map(([label, rightKey, leftKey, levels]) => (
                    <React.Fragment key={rightKey}>
                      {multiChoice(label, [
                        [t.rightAbbrev, brainstem[rightKey], setBrainstemLevel(rightKey)],
                        [t.leftAbbrev, brainstem[leftKey], setBrainstemLevel(leftKey)],
                      ], levels)}
                    </React.Fragment>
                  ))}
                </div>
              </FSRow>

              {/* P */}
              <FSRow {...fsRowProps("P")}>
                <div className="md:col-span-2 grid 2xl:grid-cols-2 gap-x-8 gap-y-4">
                  {strengthTable(t.upperLimbsMRC, ARM_MUSCLES)}
                  {strengthTable(t.lowerLimbsMRC, LEG_MUSCLES)}
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">{t.findings}</div>
                  {([
                    [t.hyperreflexia, 'hyperreflexiaRight', 'hyperreflexiaLeft'],
                    [t.babinski, 'babinskiRight', 'babinskiLeft'],
                    [t.clonus, 'clonusRight', 'clonusLeft'],
                  ] as const).map(([label, rightKey, leftKey]) => (
                    <Toggles
                      key={rightKey}
                      label={label}
                      items={[
                        { key: rightKey, short: t.rightAbbrev, checked: pyramidal[rightKey] },
                        { key: leftKey, short: t.leftAbbrev, checked: pyramidal[leftKey] },
                      ]}
                      onToggle={(key, checked) => setPyramidal((prev) => ({ ...prev, [key]: checked }))}
                    />
                  ))}
                </div>
                <div className="space-y-3 md:pt-8">
                  <Check label={t.spasticGait} checked={pyramidal.spasticGait} onChange={(checked) => setPyramidal((prev) => ({ ...prev, spasticGait: checked }))} />
                  <Check label={t.fatigability} checked={pyramidal.fatigability} onChange={(checked) => setPyramidal((prev) => ({ ...prev, fatigability: checked }))} />
                </div>
              </FSRow>

              {/* C */}
              <FSRow {...fsRowProps("C")}>
                <div className="space-y-4">
                  {multiChoice(t.limbAtaxia, LIMBS.map(([limb, abbrev]) => {
                    const key = `limbAtaxia${limb}` as const;
                    return [abbrev, cerebellar[key], setCerebellarLevel(key)] as const;
                  }), t.limbAtaxiaLevels)}
                  <Choice label={t.headTremor} value={cerebellar.headTremor} options={levelOptions(t.headTremorLevels)} onChange={setCerebellarLevel('headTremor')} />
                  <Choice label={t.otherCerebellar} value={cerebellar.otherCerebellar} options={levelOptions(t.otherCerebellarLevels)} onChange={setCerebellarLevel('otherCerebellar')} />
                </div>
                <div className="space-y-4">
                  <Choice label={t.gaitAtaxia} value={cerebellar.gaitAtaxia} options={levelOptions(t.gaitAtaxiaLevels)} onChange={setCerebellarLevel('gaitAtaxia')} />
                  <Choice label={t.truncalAtaxia} value={cerebellar.truncalAtaxia} options={levelOptions(t.truncalAtaxiaLevels)} onChange={setCerebellarLevel('truncalAtaxia')} />
                  <Choice label={t.tandemWalking} value={cerebellar.tandemWalking} options={levelOptions(t.tandemWalkingLevels)} onChange={setCerebellarLevel('tandemWalking')} />
                  <Choice label={t.romberg} value={cerebellar.romberg} options={levelOptions(t.rombergLevels)} onChange={setCerebellarLevel('romberg')} />
                  <Check label={t.unableCoordMovements} checked={cerebellar.inabilityCoordinatedMovements} onChange={(checked) => setCerebellar((prev) => ({ ...prev, inabilityCoordinatedMovements: checked }))} />
                  <div className="text-xs text-gray-600">{t.cerebellarNote}</div>
                </div>
              </FSRow>

              {/* S */}
              <FSRow {...fsRowProps("S")}>
                {sensoryModalities.map(({ prefix, label, options }) => {
                  const severity = sensoryField(prefix, "Severity") as Severity;
                  const count = sensoryField(prefix, "Count") as number;
                  return (
                    <div key={prefix} className={`space-y-2 ${prefix === "jp" ? "md:col-span-2" : ""}`}>
                      <Choice
                        label={label}
                        value={severity}
                        options={[{ value: "normal", short: "0" }, ...options]}
                        onChange={(v) => setSensorySeverity(prefix, v)}
                      />
                      <Toggles
                        disabled={severity === "normal"}
                        items={LIMBS.map(([limb, abbrev]) => ({ key: limb, short: abbrev, checked: sensoryField(prefix, limb) as boolean }))}
                        onToggle={(limb, checked) => setSensoryLimb(prefix, limb, checked)}
                      />
                      {severity !== "normal" && count === 0 && <div className="text-xs text-amber-800">{t.warnSensoryNoLimbs}</div>}
                    </div>
                  );
                })}
              </FSRow>

              {/* BB */}
              <FSRow {...fsRowProps("BB")}>
                <div className="space-y-4">
                  <div className="text-sm font-semibold">{t.bladderSymptoms}</div>
                  <Choice label={t.urinaryHesitancy} value={bb.urinaryHesitancy} options={levelOptions(t.urinaryHesitancyLevels)} onChange={setBBLevel('urinaryHesitancy')} />
                  <Choice label={t.urinaryUrgency} value={bb.urinaryUrgency} options={levelOptions(t.urinaryUrgencyLevels)} onChange={setBBLevel('urinaryUrgency')} />
                  <Choice label={t.catheterisation} value={bb.catheterisation} options={catheterisationOptions} onChange={(v) => setBB((prev) => ({ ...prev, catheterisation: v }))} />
                </div>
                <div className="space-y-4">
                  <div className="text-sm font-semibold">{t.bowelSymptoms}</div>
                  <Choice label={t.bowelDysfunction} value={bb.bowelDysfunction} options={levelOptions(t.bowelDysfunctionLevels)} onChange={setBBLevel('bowelDysfunction')} />
                </div>
              </FSRow>

              {/* M */}
              <FSRow {...fsRowProps("M")}>
                <Choice label={t.cognitiveFunction} value={levelOf(cognitionKeys)} options={cognitionOptions} onChange={setLevel(cognitionKeys)} />
                <div className="space-y-2">
                  <Choice label={t.fatigue} value={levelOf(fatigueKeys)} options={fatigueOptions} onChange={setLevel(fatigueKeys)} />
                  <div className="text-xs text-gray-600">{t.cerebralNote}</div>
                </div>
              </FSRow>

              {/* Ambulation */}
              <section id="ambulation" className="space-y-3 p-3 md:p-4 rounded-xl bg-white border scroll-mt-36 lg:scroll-mt-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center min-w-9 h-9 rounded-lg text-lg font-bold tabular-nums ${result.ambulation ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-500'}`}>
                    {result.ambulation?.score ?? 0}
                  </span>
                  <h2 className="font-semibold">{t.ambulation}</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                  <fieldset className="space-y-1">
                    <legend className="text-sm font-medium mb-1">{t.assistanceReq}</legend>
                    {assistanceLevels.map((a) => {
                      const selected = assistance === a.id;
                      return (
                        <label key={a.id} className={`flex items-start gap-2 rounded-lg px-2 py-1 cursor-pointer ${selected ? (a.id === 'none' ? 'bg-gray-100 font-medium' : 'bg-blue-50 ring-1 ring-blue-200 font-medium text-blue-950') : 'hover:bg-gray-50'}`}>
                          <input type="radio" className="mt-1" name="assist" value={a.id} checked={selected} onChange={(e) => setAssistance(e.target.value as AssistanceId)} />
                          <span className="text-sm">{a.label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {assistance === "none" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" htmlFor="walking-distance">{t.maxWalkDist}</label>
                      <input id="walking-distance" type="number" inputMode="numeric" className={`w-full rounded-xl border p-2 ${parsedDistance !== null && parsedDistance < 500 ? 'border-blue-300 bg-blue-50' : ''}`} value={distance} min={0} max={2000} step={10} onChange={(e) => setDistance(e.target.value)} />
                      <div className="text-xs opacity-70">{t.thresholds}</div>
                      {(parsedDistance === null || parsedDistance >= 500) && (
                        <Check label={t.ambulationRestricted} checked={ambulationRestricted} onChange={setAmbulationRestricted} />
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Results (narrow screens) */}
              <div className="lg:hidden">{resultPanel}</div>

              {/* Compare with previous visit */}
              <section className="p-4 rounded-xl bg-white border space-y-3">
                <h2 className="font-semibold">{t.compareTitle}</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={previousInput}
                    onChange={(e) => setPreviousInput(e.target.value)}
                    placeholder={t.comparePaste}
                    className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded"
                  />
                  {previousInput && (
                    <button onClick={() => setPreviousInput('')} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100">{t.compareClear}</button>
                  )}
                </div>
                {previousInput.trim() !== '' && !previousAssessment && <div className="text-xs text-red-600">{t.restoreError}</div>}
                {previousAssessment && change && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="text-sm border-collapse">
                        <thead>
                          <tr className="text-left">
                            <th className="py-1 pr-4"></th>
                            <th className="py-1 pr-4">{t.previous}</th>
                            <th className="py-1 pr-4">{t.current}</th>
                            <th className="py-1 pr-4">{t.change}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'EDSS', prev: previousAssessment.result.edss, curr: edss, decimals: 1 },
                            ...FS_KEYS.map((k) => ({ label: fsMeta[k].label, prev: previousAssessment.fs[k], curr: fs[k], decimals: 0 })),
                            { label: t.ambulationScore, prev: previousAssessment.result.ambulation?.score ?? 0, curr: result.ambulation?.score ?? 0, decimals: 0 },
                          ].map((row) => (
                            <tr key={row.label} className="border-t">
                              <td className="py-1 pr-4">{row.label}</td>
                              <td className="py-1 pr-4 tabular-nums">{row.prev.toFixed(row.decimals)}</td>
                              <td className="py-1 pr-4 tabular-nums">{row.curr.toFixed(row.decimals)}</td>
                              <td className={`py-1 pr-4 tabular-nums ${row.curr !== row.prev ? 'font-semibold' : 'opacity-50'}`}>
                                {row.curr === row.prev ? '–' : row.decimals ? signed(row.curr - row.prev) : `${row.curr > row.prev ? '+' : '−'}${Math.abs(row.curr - row.prev)}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-gray-600">{t.compareRescoredNote}</div>
                  </>
                )}
              </section>

              {/* State Save/Restore */}
              <section className="p-4 rounded-xl bg-gray-100 space-y-3">
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">{t.formStateString}</div>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      value={stateString}
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded resize-none"
                      rows={1}
                      style={{ minHeight: '32px' }}
                    />
                    <button onClick={copyState} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">
                      {copiedState ? t.copied : t.copyButton}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">{t.restoreFromString}</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      placeholder={t.pasteHere}
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded"
                    />
                    <button onClick={restoreState} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">
                      {t.restoreButton}
                    </button>
                  </div>
                  {restoreError && <div className="text-xs text-red-600">{restoreError}</div>}
                </div>
              </section>
            </main>

            {/* Results (wide screens) */}
            <aside className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-4">
              {resultPanel}
            </aside>
          </div>
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
                  {FS_KEYS.map((k) => `${k}=${fs[k]}${overridden[k] ? '*' : ''}`).join(', ')}
                  {FS_KEYS.some((k) => overridden[k]) && <div className="text-xs text-amber-800 mt-1">* {t.fsManualNote}</div>}
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

              {/* Step 3: FS-Based Step */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="font-semibold text-sm mb-2">{t.step} 3: {t.fsBasedScore}</div>
                <div className="font-mono text-lg font-bold mb-3">{result.fsStep.edss.toFixed(1)}</div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="font-semibold text-xs mb-2">{t.fsPatternsTableTitle}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-purple-100">
                          {FS_COLUMNS.map((c) => (
                            <th key={c} className="border border-purple-300 px-2 py-1 text-center font-semibold">FS {c === "5" ? "5/6" : c}</th>
                          ))}
                          <th className="border border-purple-300 px-2 py-1 text-center font-semibold">EDSS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {FS_STEP_ROWS.map((row, i) => (
                          <tr key={i} className={result.fsStep.row === i ? "bg-yellow-100 font-bold" : ""}>
                            {FS_COLUMNS.map((c) => (
                              <td key={c} className="border border-purple-200 px-2 py-1 text-center">{row.cells[c] ? `${row.cells[c]}×` : ""}</td>
                            ))}
                            <td className="border border-purple-200 px-2 py-1 text-center font-mono">{row.edss.toFixed(1)}{row.inTable ? "" : "*"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">{t.blankCellsNote}</div>
                  <div className="text-xs text-gray-600 mt-1">{t.notInTableNote}</div>
                </div>
              </div>

              {/* Step 4: Ambulation */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-semibold text-sm mb-2">{t.step} 4: {t.ambulationBasedScore}</div>
                <div className="text-sm">
                  {result.ambulation ? (
                    <>
                      <div className="font-mono text-lg font-bold">{(result.ambulation.exclusive ? t.ambulationDefines : t.ambulationAtLeast).replace('{edss}', result.ambulation.minEDSS.toFixed(1))}</div>
                      <div className="text-xs mt-1 text-gray-700">{describeAmbulation(result.ambulation)}</div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-700">{t.ambulationNoLimit}</div>
                  )}
                </div>
              </div>

              {/* Step 5: Final Score Selection */}
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="font-semibold text-sm mb-2">{t.step} 5: {t.finalScoreSelection}</div>
                <div className="bg-white p-3 rounded border text-xs space-y-1">
                  {result.ambulation?.exclusive ? (
                    <div>{t.finalRuleExclusive}: <span className="font-bold text-base">{edss.toFixed(1)}</span></div>
                  ) : (
                    <>
                      <div className="font-mono">{t.finalRuleMax}</div>
                      <div>max({result.fsStep.edss.toFixed(1)}, {(result.ambulation?.minEDSS ?? 0).toFixed(1)}) = <span className="font-bold text-base">{edss.toFixed(1)}</span></div>
                    </>
                  )}
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