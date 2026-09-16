import React, { useEffect, useMemo, useState } from "react";
import { Language, translations } from "./i18n/translations";
import type { AssistanceId, EyeAcuity, Severity } from "./types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm, CatheterisationLevel } from "./types/forms";
import { ARM_MUSCLES, LEG_MUSCLES } from "./types/forms";
import { formatEyeAcuity } from "./utils/formatting";
import { convertVisualForEDSS, convertBBForEDSS, correctedFS, FS_STEP_ROWS, type AmbulationResult, type FSColumn } from "./utils/edss";
import { assess, compareEDSS, FS_KEYS, FS_MAX, type FSKey } from "./utils/assessment";
import { DEFAULT_STATE, decodeState, encodeState, type FormState } from "./utils/state";
import { FSRow } from "./components/FSRow";
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

function LevelSelect({ label, value, labels, onChange }: { label: string; value: number; labels: string[]; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <select className="w-full border rounded-lg p-1 text-sm" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {labels.map((l, i) => <option key={i} value={i}>{l}</option>)}
      </select>
    </div>
  );
}

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
  const fsRowProps = (code: FSKey) => ({
    code,
    meta: fsMeta[code],
    value: fs[code],
    suggested: suggested[code],
    overridden: overridden[code],
    onOverride: setOverride(code),
    labels: { override: t.overrideScore, auto: t.fsAuto, manual: t.fsManual, reset: t.fsUseSuggested },
  });
  const fsWithOverride = (key: FSKey) => `${key} ${fs[key]}${overridden[key] ? ` [${t.fsManualShort.replace('{suggested}', String(suggested[key]))}]` : ''}`;

  // Comparison with a previous visit (saved form state)
  const [previousInput, setPreviousInput] = useState('');
  const previousAssessment = useMemo(() => {
    const state = previousInput.trim() ? decodeState(previousInput) : null;
    return state ? assess(state) : null;
  }, [previousInput]);
  const change = previousAssessment ? compareEDSS(previousAssessment.result.edss, edss) : null;
  const changeClass = !change ? '' : change.status === 'worsening' ? 'bg-red-100 text-red-900' : change.status === 'improvement' ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-800';
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
      const sides = [left && t.leftAbbrev, right && t.rightAbbrev].filter(Boolean);
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
      `L: ${formatEyeAcuity(visual.leftEyeAcuity)}, R: ${formatEyeAcuity(visual.rightEyeAcuity)}`,
      ...visualExtras(),
    ].join(', ');
    const vAbnormal = acuityAbnormal || visualExtras().length > 0;

    // Brainstem summary
    const nystagmusText = brainstem.nystagmus === "spontaneous" ? t.spontaneousNystagmus :
                          brainstem.nystagmus === "clear" ? t.clearNystagmus :
                          brainstem.nystagmus === "mild" ? t.mildNystagmus : '';

    // Format sides with levels (e.g., "L:2+R:3" or "L:2" or "R:3")
    const levelSides = (left: number, right: number) => [
      left > 0 && `${t.leftAbbrev}:${left}`,
      right > 0 && `${t.rightAbbrev}:${right}`
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
      const acuityText = `${t.leftEye} ${formatEyeAcuity(visual.leftEyeAcuity)}, ${t.rightEye} ${formatEyeAcuity(visual.rightEyeAcuity)}`;
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
      left > 0 && `${t.leftAbbrev} (${t.level} ${left})`,
      right > 0 && `${t.rightAbbrev} (${t.level} ${right})`
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
    const sideWord = (left: boolean, right: boolean) => left && right ? t.bilaterally : left ? t.left : t.right;
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

  const cognitionOptions = [
    ['signsOnlyCognition', t.signsOnlyCog],
    ['lightlyReducedCognition', t.lightlyReducedCog],
    ['moderatelyReducedCognition', t.moderatelyReducedCog],
    ['markedlyReducedCognition', t.markedlyReducedCog],
    ['pronouncedDementia', t.pronouncedDementia],
  ] as const;
  const fatigueOptions = [
    ['mildFatigue', t.mildFatigue],
    ['moderateToSevereFatigue', t.moderateSevereFatigue],
  ] as const;
  // Options within a group are mutually exclusive
  const setExclusive = (keys: readonly (readonly [keyof MentalForm, string])[], key: keyof MentalForm, checked: boolean) =>
    setMental((prev) => ({ ...prev, ...Object.fromEntries(keys.map(([k]) => [k, k === key ? checked : false])) }));

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    // Update URL parameter without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('language', newLang === 'no' ? 'norwegian' : 'english');
    window.history.pushState({}, '', url.toString());
  }

  // ---------- UI ----------
  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
            <div className="flex items-center gap-4">
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

          {/* Sticky live result */}
          <div className="sticky top-2 z-40 rounded-xl border bg-white/95 backdrop-blur shadow-sm px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs uppercase tracking-wide opacity-60">EDSS</span>
                <span className="text-3xl font-black tabular-nums">{edss.toFixed(1)}</span>
                {change && (
                  <span className={`text-xs font-semibold rounded-lg px-2 py-0.5 ${changeClass}`} title={t.previousVisit}>
                    {signed(change.delta)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FS_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => scrollToSection(`fs-${k}`)}
                    className={`rounded-lg border px-2 py-1 text-xs font-mono hover:bg-gray-100 ${overridden[k] ? 'border-amber-400 bg-amber-50' : 'bg-white'}`}
                    title={overridden[k] ? t.fsManual.replace('{suggested}', String(suggested[k])) : undefined}
                  >
                    {k} <span className="font-bold">{fs[k]}</span>
                    {correctedFSForDisplay[k] !== fs[k] && <span className="opacity-60">→{correctedFSForDisplay[k]}</span>}
                  </button>
                ))}
                <button type="button" onClick={() => scrollToSection('ambulation')} className="rounded-lg border bg-white px-2 py-1 text-xs font-mono hover:bg-gray-100">
                  {t.ambulationShort} <span className="font-bold">{result.ambulation?.score ?? 0}</span>
                </button>
              </div>
            </div>
          </div>

          {/* V */}
          <FSRow {...fsRowProps("V")}>
            <div className="space-y-2">
              {([['leftEyeAcuity', t.leftEyeAcuity], ['rightEyeAcuity', t.rightEyeAcuity]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="text-sm font-medium">{label}</div>
                  <select className="w-full border rounded-lg p-1 text-sm" value={visual[key]} onChange={(e)=>setVisual({...visual, [key]: e.target.value as EyeAcuity})}>
                    {EYE_ACUITIES.map((a) => <option key={a} value={a}>{formatEyeAcuity(a)}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.visualFieldDeficit}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={visual.visualFieldDeficit} onChange={(e)=>setVisual({...visual, visualFieldDeficit: e.target.value as VisualForm["visualFieldDeficit"]})}>
                  <option value="none">{t.vfNone}</option>
                  <option value="mild">{t.vfMild}</option>
                  <option value="moderate">{t.vfModerate}</option>
                  <option value="marked">{t.vfMarked}</option>
                </select>
              </div>
              <LevelSelect label={t.scotoma} value={visual.scotoma} labels={t.scotomaLevels} onChange={(v)=>setVisual({...visual, scotoma: v as VisualForm["scotoma"]})} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visual.discPallor} onChange={(e)=>setVisual({...visual, discPallor: e.target.checked})}/>
                {t.discPallor}
              </label>
            </div>
          </FSRow>

          {/* BS */}
          <FSRow {...fsRowProps("BS")}>
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
                <select className="w-full border rounded-lg p-1 text-sm" value={brainstem.nystagmus} onChange={(e)=>setBrainstem({...brainstem, nystagmus: e.target.value as "none"|"mild"|"clear"|"spontaneous"})}>
                  <option value="none">{t.nystagmusNone}</option>
                  <option value="mild">{t.nystagmusMild}</option>
                  <option value="clear">{t.nystagmusClear}</option>
                  <option value="spontaneous">{t.nystagmusSpontaneous}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={brainstem.ino} onChange={(e)=>setBrainstem({...brainstem, ino: e.target.checked})}/>
                  {t.ino}
                </label>
              </div>

              <LevelSelect label={t.dysarthria} value={brainstem.dysarthriaLevel} labels={t.dysarthriaLevels} onChange={setBrainstemLevel('dysarthriaLevel')} />
              <LevelSelect label={t.dysphagia} value={brainstem.dysphagiaLevel} labels={t.dysphagiaLevels} onChange={setBrainstemLevel('dysphagiaLevel')} />
              <LevelSelect label={t.otherCranialNerves} value={brainstem.otherCranialNerves} labels={t.otherCranialNervesLevels} onChange={setBrainstemLevel('otherCranialNerves')} />
            </div>

            <div className="space-y-2">
              {([
                [t.facialSensibility, 'facialSensLeft', 'facialSensRight', [t.facialSensibility0, t.facialSensibility1, t.facialSensibility2, t.facialSensibility3, t.facialSensibility4]],
                [t.facialSymmetry, 'facialSymLeft', 'facialSymRight', [t.facialSymmetry0, t.facialSymmetry1, t.facialSymmetry2, t.facialSymmetry3, t.facialSymmetry4]],
                [t.hearing, 'hearingLeft', 'hearingRight', [t.hearing0, t.hearing1, t.hearing2, t.hearing3, t.hearing4]],
              ] as const).map(([label, leftKey, rightKey, levels]) => (
                <div key={leftKey} className="space-y-1">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="flex gap-2">
                    {([[t.leftAbbrev, leftKey], [t.rightAbbrev, rightKey]] as const).map(([side, key]) => (
                      <div key={key} className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-1">{side}</div>
                        <select className="w-full border rounded-lg p-1 text-sm" value={brainstem[key]} onChange={(e)=>setBrainstemLevel(key)(Number(e.target.value))}>
                          {levels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FSRow>

          {/* P — Registry-style */}
          <FSRow {...fsRowProps("P")}>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.upperLimbsMRC}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">{t.movement}</th>
                      <th className="py-1 pr-2">{t.rightAbbrev}</th>
                      <th className="py-1 pr-2">{t.leftAbbrev}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ARM_MUSCLES.map((m) => (
                      <tr key={m} className="border-t">
                        <td className="py-1 pr-2">{t.muscles[m]}</td>
                        {(["R", "L"] as const).map((side) => (
                          <td key={side} className="py-1 pr-2">
                            <select className="border rounded-lg p-1" value={pyramidal[`${m}${side}`]} onChange={(e)=> setPyramidal(prev=> ({...prev, [`${m}${side}`]: Number(e.target.value)}))}>
                              {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t.lowerLimbsMRC}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-2">{t.movement}</th>
                      <th className="py-1 pr-2">{t.rightAbbrev}</th>
                      <th className="py-1 pr-2">{t.leftAbbrev}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEG_MUSCLES.map((m) => (
                      <tr key={m} className="border-t">
                        <td className="py-1 pr-2">{t.muscles[m]}</td>
                        {(["R", "L"] as const).map((side) => (
                          <td key={side} className="py-1 pr-2">
                            <select className="border rounded-lg p-1" value={pyramidal[`${m}${side}`]} onChange={(e)=> setPyramidal(prev=> ({...prev, [`${m}${side}`]: Number(e.target.value)}))}>
                              {[5,4,3,2,1,0].map(v=> <option key={v} value={v}>{v}</option>)}
                            </select>
                          </td>
                        ))}
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
                      <span>{t.leftAbbrev}</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={pyramidal[rightKey]}
                        onChange={(e)=> setPyramidal(prev=> ({...prev, [rightKey]: e.target.checked}))}
                      />
                      <span>{t.rightAbbrev}</span>
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
          </FSRow>

          {/* C */}
          <FSRow {...fsRowProps("C")}>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.limbAtaxia}</div>
                {([
                  ['limbAtaxiaRightArm', t.rightArmAbbrev],
                  ['limbAtaxiaLeftArm', t.leftArmAbbrev],
                  ['limbAtaxiaRightLeg', t.rightLegAbbrev],
                  ['limbAtaxiaLeftLeg', t.leftLegAbbrev],
                ] as const).map(([key, abbrev]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-12 shrink-0">{abbrev}</span>
                    <select className="flex-1 min-w-0 border rounded-lg p-1 text-sm" value={cerebellar[key]} onChange={(e)=>setCerebellarLevel(key)(Number(e.target.value))}>
                      {t.limbAtaxiaLevels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <LevelSelect label={t.headTremor} value={cerebellar.headTremor} labels={t.headTremorLevels} onChange={setCerebellarLevel('headTremor')} />
              <LevelSelect label={t.otherCerebellar} value={cerebellar.otherCerebellar} labels={t.otherCerebellarLevels} onChange={setCerebellarLevel('otherCerebellar')} />
            </div>
            <div className="space-y-2">
              <LevelSelect label={t.gaitAtaxia} value={cerebellar.gaitAtaxia} labels={t.gaitAtaxiaLevels} onChange={setCerebellarLevel('gaitAtaxia')} />
              <LevelSelect label={t.truncalAtaxia} value={cerebellar.truncalAtaxia} labels={t.truncalAtaxiaLevels} onChange={setCerebellarLevel('truncalAtaxia')} />
              <LevelSelect label={t.tandemWalking} value={cerebellar.tandemWalking} labels={t.tandemWalkingLevels} onChange={setCerebellarLevel('tandemWalking')} />
              <LevelSelect label={t.romberg} value={cerebellar.romberg} labels={t.rombergLevels} onChange={setCerebellarLevel('romberg')} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cerebellar.inabilityCoordinatedMovements} onChange={(e)=>setCerebellar({ ...cerebellar, inabilityCoordinatedMovements: e.target.checked })}/>
                {t.unableCoordMovements}
              </label>
              <div className="text-xs text-gray-600">{t.cerebellarNote}</div>
            </div>
          </FSRow>

          {/* S — Registry-style */}
          <FSRow {...fsRowProps("S")}>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.vibration}</div>
              <div className="space-y-1">
                <label className="text-sm">{t.severity}</label>
                <select className="w-full border rounded-lg p-1 text-sm" value={sensory.vibSeverity} onChange={(e)=> {
                  const newSeverity = e.target.value as Severity;
                  setSensory({...sensory, vibSeverity: newSeverity, vibCount: newSeverity === 'normal' ? 0 : sensory.vibCount, vibRightArm: newSeverity === 'normal' ? false : sensory.vibRightArm, vibLeftArm: newSeverity === 'normal' ? false : sensory.vibLeftArm, vibRightLeg: newSeverity === 'normal' ? false : sensory.vibRightLeg, vibLeftLeg: newSeverity === 'normal' ? false : sensory.vibLeftLeg});
                }}>
                  <option value="normal">0 - {t.sensNormal}</option>
                  <option value="mild">{t.vibOptions.mild}</option>
                  <option value="moderate">{t.vibOptions.moderate}</option>
                  <option value="marked">{t.vibOptions.marked}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibRightArm} onChange={(e)=> {
                    const updated = {...sensory, vibRightArm: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibLeftArm} onChange={(e)=> {
                    const updated = {...sensory, vibLeftArm: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibRightLeg} onChange={(e)=> {
                    const updated = {...sensory, vibRightLeg: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightLegAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.vibLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, vibLeftLeg: e.target.checked};
                    updated.vibCount = [updated.vibRightArm, updated.vibLeftArm, updated.vibRightLeg, updated.vibLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftLegAbbrev}</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.painTouch}</div>
              <div className="space-y-1">
                <label className="text-sm">{t.severity}</label>
                <select className="w-full border rounded-lg p-1 text-sm" value={sensory.ptSeverity} onChange={(e)=> {
                  const newSeverity = e.target.value as Severity;
                  setSensory({...sensory, ptSeverity: newSeverity, ptCount: newSeverity === 'normal' ? 0 : sensory.ptCount, ptRightArm: newSeverity === 'normal' ? false : sensory.ptRightArm, ptLeftArm: newSeverity === 'normal' ? false : sensory.ptLeftArm, ptRightLeg: newSeverity === 'normal' ? false : sensory.ptRightLeg, ptLeftLeg: newSeverity === 'normal' ? false : sensory.ptLeftLeg});
                }}>
                  <option value="normal">0 - {t.sensNormal}</option>
                  <option value="signs">{t.ptOptions.signs}</option>
                  <option value="mild">{t.ptOptions.mild}</option>
                  <option value="moderate">{t.ptOptions.moderate}</option>
                  <option value="marked">{t.ptOptions.marked}</option>
                  <option value="absent">{t.ptOptions.absent}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptRightArm} onChange={(e)=> {
                    const updated = {...sensory, ptRightArm: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptLeftArm} onChange={(e)=> {
                    const updated = {...sensory, ptLeftArm: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptRightLeg} onChange={(e)=> {
                    const updated = {...sensory, ptRightLeg: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightLegAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.ptLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, ptLeftLeg: e.target.checked};
                    updated.ptCount = [updated.ptRightArm, updated.ptLeftArm, updated.ptRightLeg, updated.ptLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftLegAbbrev}</span>
                </label>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">{t.jointPosition}</div>
              <div className="space-y-1">
                <label className="text-sm">{t.severity}</label>
                <select className="w-full border rounded-lg p-1 text-sm" value={sensory.jpSeverity} onChange={(e)=> {
                  const newSeverity = e.target.value as Severity;
                  setSensory({...sensory, jpSeverity: newSeverity, jpCount: newSeverity === 'normal' ? 0 : sensory.jpCount, jpRightArm: newSeverity === 'normal' ? false : sensory.jpRightArm, jpLeftArm: newSeverity === 'normal' ? false : sensory.jpLeftArm, jpRightLeg: newSeverity === 'normal' ? false : sensory.jpRightLeg, jpLeftLeg: newSeverity === 'normal' ? false : sensory.jpLeftLeg});
                }}>
                  <option value="normal">0 - {t.sensNormal}</option>
                  <option value="mild">{t.jpOptions.mild}</option>
                  <option value="moderate">{t.jpOptions.moderate}</option>
                  <option value="marked">{t.jpOptions.marked}</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpRightArm} onChange={(e)=> {
                    const updated = {...sensory, jpRightArm: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpLeftArm} onChange={(e)=> {
                    const updated = {...sensory, jpLeftArm: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftArmAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpRightLeg} onChange={(e)=> {
                    const updated = {...sensory, jpRightLeg: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.rightLegAbbrev}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={sensory.jpLeftLeg} onChange={(e)=> {
                    const updated = {...sensory, jpLeftLeg: e.target.checked};
                    updated.jpCount = [updated.jpRightArm, updated.jpLeftArm, updated.jpRightLeg, updated.jpLeftLeg].filter(Boolean).length;
                    setSensory(updated);
                  }}/>
                  <span>{t.leftLegAbbrev}</span>
                </label>
              </div>
            </div>
          </FSRow>

          {/* BB */}
          <FSRow {...fsRowProps("BB")}>
            <div className="space-y-2">
              <div className="text-sm font-semibold">{t.bladderSymptoms}</div>
              <LevelSelect label={t.urinaryHesitancy} value={bb.urinaryHesitancy} labels={t.urinaryHesitancyLevels} onChange={setBBLevel('urinaryHesitancy')} />
              <LevelSelect label={t.urinaryUrgency} value={bb.urinaryUrgency} labels={t.urinaryUrgencyLevels} onChange={setBBLevel('urinaryUrgency')} />
              <div className="space-y-1">
                <div className="text-sm font-medium">{t.catheterisation}</div>
                <select className="w-full border rounded-lg p-1 text-sm" value={bb.catheterisation} onChange={(e)=>setBB({ ...bb, catheterisation: e.target.value as CatheterisationLevel })}>
                  {(Object.keys(t.catheterisationLevels) as CatheterisationLevel[]).map((k) => <option key={k} value={k}>{t.catheterisationLevels[k]}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">{t.bowelSymptoms}</div>
              <LevelSelect label={t.bowelDysfunction} value={bb.bowelDysfunction} labels={t.bowelDysfunctionLevels} onChange={setBBLevel('bowelDysfunction')} />
            </div>
          </FSRow>

          {/* M */}
          <FSRow {...fsRowProps("M")}>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.cognitiveFunction}</div>
              {cognitionOptions.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental[key]} onChange={(e)=>setExclusive(cognitionOptions, key, e.target.checked)}/>{label}</label>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t.fatigue}</div>
              {fatigueOptions.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mental[key]} onChange={(e)=>setExclusive(fatigueOptions, key, e.target.checked)}/>{label}</label>
              ))}
              <div className="text-xs text-gray-600 pt-1">{t.cerebralNote}</div>
            </div>
          </FSRow>

          {/* Ambulation + Result + Copy */}
          <section className="grid gap-6 md:grid-cols-2">
            <section id="ambulation" className="space-y-3 p-3 rounded-2xl bg-white border scroll-mt-28">
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
                    {(parsedDistance === null || parsedDistance >= 500) && (
                      <label className="flex items-start gap-2 text-sm pt-1">
                        <input type="checkbox" className="mt-1" checked={ambulationRestricted} onChange={(e) => setAmbulationRestricted(e.target.checked)} />
                        <span>{t.ambulationRestricted}</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="p-4 md:p-6 rounded-2xl bg-white shadow border">
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-black">{edss.toFixed(1)}</div>
                <div className="text-sm uppercase tracking-wide opacity-60">EDSS</div>
              </div>
              <div className="mt-2 text-sm opacity-80">{rationale}</div>
              <div className="mt-4 text-xs opacity-70">
                <div>{t.rawFS}: {countFS(0)}×0, {countFS(1)}×1, {countFS(2)}×2, {countFS(3)}×3, {countFS(4)}×4, {countFS(5)}×5, {countFS(6)}×6</div>
                <div className="mt-1">{t.correctedFS}: {countCorrectedFS(0)}×0, {countCorrectedFS(1)}×1, {countCorrectedFS(2)}×2, {countCorrectedFS(3)}×3, {countCorrectedFS(4)}×4, {countCorrectedFS(5)}×5, {countCorrectedFS(6)}×6</div>
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

            {/* State Save/Restore Section */}
            <section className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">{t.formStateString}</div>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      value={stateString}
                      className="flex-1 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded resize-none"
                      rows={1}
                      style={{ minHeight: '32px' }}
                    />
                    <button
                      onClick={copyState}
                      className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
                    >
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
                      className="flex-1 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded"
                    />
                    <button
                      onClick={restoreState}
                      className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
                    >
                      {t.restoreButton}
                    </button>
                  </div>
                  {restoreError && (
                    <div className="text-xs text-red-600">{restoreError}</div>
                  )}
                </div>
              </div>
            </section>
          </section>

          {/* Compare with previous visit */}
          <section className="p-4 rounded-2xl bg-white border space-y-3">
            <h2 className="text-xl font-semibold">{t.compareTitle}</h2>
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
                <div className={`text-sm rounded-lg p-2 ${changeClass}`}>
                  {(change.status === 'worsening' ? t.compareWorsening : change.status === 'improvement' ? t.compareImprovement : t.compareStable)
                    .replace('{threshold}', change.threshold.toFixed(1))
                    .replace('{previous}', previousAssessment.result.edss.toFixed(1))}
                </div>
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
                          <td className={`py-1 pr-4 tabular-nums ${row.curr > row.prev ? 'text-red-700 font-semibold' : row.curr < row.prev ? 'text-green-700 font-semibold' : 'opacity-50'}`}>
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