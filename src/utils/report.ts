// ============================================================================
// REPORT TEXT: copy-ready summary and narrative examination text
// ============================================================================

import type { Translations } from "../i18n/translations";
import type { AssistanceId, Severity } from "../types/edss";
import { ARM_MUSCLES, LEG_MUSCLES } from "../types/forms";
import type { Assessment, FSKey } from "./assessment";
import { convertBBForEDSS, convertVisualForEDSS, type AmbulationResult } from "./edss";
import { formatEyeAcuity } from "./formatting";
import type { FormState } from "./state";

export function assistanceLevels(t: Translations): { id: AssistanceId; label: string }[] {
  return [
    { id: "none", label: t.noAssistance },
    { id: "uni_50_plus", label: t.uniAid50Plus },
    { id: "uni_under_50", label: t.uniAidUnder50 },
    { id: "bi_120_plus", label: t.biAid120Plus },
    { id: "bi_5_to_120", label: t.biAid5to120 },
    { id: "bi_under_5", label: t.biAidUnder5 },
    { id: "wheel_self", label: t.wheelSelf },
    { id: "wheel_some_help", label: t.wheelSomeHelp },
    { id: "wheel_dependent", label: t.wheelDependent },
    { id: "bed_chair_arms_ok", label: t.bedChairArmsOk },
    { id: "bed_chair_limited_arms", label: t.bedChairLimitedArms },
    { id: "helpless", label: t.helpless },
    { id: "total_care", label: t.totalCare },
  ];
}

const assistanceLabel = (id: AssistanceId, t: Translations) => assistanceLevels(t).find((a) => a.id === id)?.label ?? id;

export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)}`;

export const describeAmbulation = (a: AmbulationResult, t: Translations) =>
  `${t.ambulationScore} ${a.score} (${t.ambulationScoreDescriptions[a.score]})`;

export function rationaleText(assessment: Assessment, t: Translations): string {
  const { result } = assessment;
  return [
    `${t.fsBasedScore} ${result.fsStep.edss.toFixed(1)}`,
    result.ambulation && `${describeAmbulation(result.ambulation, t)} → ${(result.ambulation.exclusive ? t.ambulationDefines : t.ambulationAtLeast).replace('{edss}', result.ambulation.minEDSS.toFixed(1))}`,
  ].filter(Boolean).join(' · ');
}

const present = (items: (string | false | 0 | null | undefined)[]): string[] => items.filter((x): x is string => Boolean(x));

const joinWithAnd = (items: string[], andWord: string): string => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${andWord} ${items[1]}`;
  return items.slice(0, -1).join(', ') + ` ${andWord} ${items[items.length - 1]}`;
};

const capitalize = (str: string): string => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const severityText = (severity: Severity, t: Translations) => ({
  normal: t.sensNormal, signs: t.sensSigns, mild: t.sensMild, moderate: t.sensModerate, marked: t.sensMarked, absent: t.sensAbsent,
})[severity];

const nystagmusText = (state: FormState, t: Translations) =>
  ({ none: '', mild: t.mildNystagmus, clear: t.clearNystagmus, spontaneous: t.spontaneousNystagmus })[state.brainstem.nystagmus];

function visualExtras(state: FormState, t: Translations): string[] {
  const { visual } = state;
  const vfText = visual.visualFieldDeficit === 'mild' ? t.mild : visual.visualFieldDeficit === 'moderate' ? t.moderate : t.marked;
  return present([
    visual.visualFieldDeficit !== 'none' && `${vfText} ${t.visualFieldDeficitText}`,
    visual.scotoma > 0 && t.scotomaShort[visual.scotoma],
    visual.discPallor && t.discPallorShort,
  ]);
}

function cerebellarFindings(state: FormState, t: Translations): string[] {
  const c = state.cerebellar;
  const limbParts = ([
    [c.limbAtaxiaRightArm, t.rightArmAbbrev],
    [c.limbAtaxiaLeftArm, t.leftArmAbbrev],
    [c.limbAtaxiaRightLeg, t.rightLegAbbrev],
    [c.limbAtaxiaLeftLeg, t.leftLegAbbrev],
  ] as const).filter(([level]) => level > 0).map(([level, abbrev]) => `${abbrev} ${t.level} ${level}`);
  const graded = (level: number, text: string) => level > 0 && `${text} (${t.level} ${level})`;
  return present([
    c.inabilityCoordinatedMovements && t.unableCoordMovementsText,
    limbParts.length > 0 && `${t.limbAtaxiaText} ${limbParts.join(', ')}`,
    graded(c.gaitAtaxia, t.gaitAtaxiaText),
    graded(c.truncalAtaxia, t.truncalAtaxiaText),
    graded(c.headTremor, t.headTremorText),
    c.tandemWalking === 1 && t.tandemImpairedText,
    c.tandemWalking === 2 && t.tandemNotPossibleText,
    graded(c.romberg, t.rombergText),
    graded(c.otherCerebellar, t.otherCerebellarText),
  ]);
}

const bowelBladderFindings = (state: FormState, t: Translations): string[] => present([
  t.urinaryHesitancyShort[state.bb.urinaryHesitancy],
  t.urinaryUrgencyShort[state.bb.urinaryUrgency],
  t.catheterisationShort[state.bb.catheterisation],
  t.bowelDysfunctionShort[state.bb.bowelDysfunction],
]);

function mentalFindings(state: FormState, t: Translations): string[] {
  const m = state.mental;
  return present([
    m.pronouncedDementia && t.pronouncedDementiaShort,
    m.markedlyReducedCognition && t.markedlyReducedCogShort,
    m.moderatelyReducedCognition && t.moderatelyReducedCogShort,
    m.lightlyReducedCognition && t.lightlyReducedCogShort,
    m.signsOnlyCognition && t.signsOnlyCogShort,
    m.moderateToSevereFatigue && t.moderateSevereFatigueShort,
    m.mildFatigue && t.mildFatigueShort,
  ]);
}

const walkingRestrictedApplies = (state: FormState, assessment: Assessment) =>
  state.assistance === 'none' && state.ambulationRestricted && (assessment.distance === null || assessment.distance >= 500);

const LIMB_KEYS = ["RightArm", "LeftArm", "RightLeg", "LeftLeg"] as const;
type SensoryPrefix = "vib" | "pt" | "jp";
const sensoryValue = (state: FormState, prefix: SensoryPrefix, field: string) =>
  (state.sensory as unknown as Record<string, unknown>)[`${prefix}${field}`];

export function buildSummary(state: FormState, assessment: Assessment, t: Translations, previous?: Assessment | null): string {
  const { fs, suggested, overridden, result, distance } = assessment;
  const { pyramidal, visual, brainstem } = state;
  const edss = result.edss;

  const rawDistance = Number(state.walkingDistance);
  const ambFinding = state.assistance === 'none'
    ? (Number.isFinite(rawDistance) && rawDistance > 2000 ? t.walkingDistanceNotLimited : distance != null ? `${t.unaided} ${distance} m` : `${t.unaided} (n/a)`)
      + (walkingRestrictedApplies(state, assessment) ? `, ${t.walkingRangeRestricted}` : '')
    : assistanceLabel(state.assistance, t);

  const fsWithOverride = (key: FSKey) => `${key} ${fs[key]}${overridden[key] ? ` [${t.fsManualShort.replace('{suggested}', String(suggested[key]))}]` : ''}`;
  const withFindings = (findings: string) => findings ? ` (${findings})` : '';

  // Pyramidal
  const weaknessText = [...ARM_MUSCLES, ...LEG_MUSCLES]
    .flatMap((m) => [
      { val: pyramidal[`${m}R`], name: t.muscles[m], side: t.rightAbbrev },
      { val: pyramidal[`${m}L`], name: t.muscles[m], side: t.leftAbbrev },
    ])
    .filter((m) => m.val < 5).map((m) => `${m.name} ${m.side} ${t.grade} ${m.val}`).join(', ');
  const sidesText = (label: string, left: boolean, right: boolean) => {
    const sides = [right && t.rightAbbrev, left && t.leftAbbrev].filter(Boolean);
    return sides.length > 0 ? `${label} ${sides.join('+')}` : '';
  };
  const pFlags = present([
    weaknessText,
    sidesText(t.hyperreflexia.toLowerCase(), pyramidal.hyperreflexiaLeft, pyramidal.hyperreflexiaRight),
    sidesText(t.babinski, pyramidal.babinskiLeft, pyramidal.babinskiRight),
    sidesText(t.clonus.toLowerCase(), pyramidal.clonusLeft, pyramidal.clonusRight),
    pyramidal.spasticGait && t.spasticGaitText,
    pyramidal.fatigability && t.fatigability.toLowerCase(),
  ]).join(', ');

  // Visual
  const vConverted = convertVisualForEDSS(fs.V);
  const extras = visualExtras(state, t);
  const vAbnormal = visual.leftEyeAcuity !== "1.0" || visual.rightEyeAcuity !== "1.0" || extras.length > 0;
  const vFindings = [`${t.rightAbbrev}: ${formatEyeAcuity(visual.rightEyeAcuity)}, ${t.leftAbbrev}: ${formatEyeAcuity(visual.leftEyeAcuity)}`, ...extras].join(', ');

  // Brainstem: sides with levels, right first (e.g. "R:3+L:2")
  const levelSides = (left: number, right: number) => present([
    right > 0 && `${t.rightAbbrev}:${right}`,
    left > 0 && `${t.leftAbbrev}:${left}`,
  ]).join('+');
  const facialSensSides = levelSides(brainstem.facialSensLeft, brainstem.facialSensRight);
  const facialSymSides = levelSides(brainstem.facialSymLeft, brainstem.facialSymRight);
  const hearingSides = levelSides(brainstem.hearingLeft, brainstem.hearingRight);
  const bsFindings = present([
    brainstem.eyeMotilityLevel > 0 && `${t.eyeMotilityImpairment} ${brainstem.eyeMotilityLevel}`,
    nystagmusText(state, t),
    brainstem.ino && t.ino,
    facialSensSides && `${t.facialSens} ${facialSensSides}`,
    facialSymSides && `${t.facialSym} ${facialSymSides}`,
    hearingSides && `${t.hearingImpairment} ${hearingSides}`,
    brainstem.dysarthriaLevel > 0 && `${t.dysarthria} ${brainstem.dysarthriaLevel}`,
    brainstem.dysphagiaLevel > 0 && `${t.dysphagia} ${brainstem.dysphagiaLevel}`,
    brainstem.otherCranialNerves > 0 && `${t.otherCranialNerveDeficit} ${brainstem.otherCranialNerves}`,
  ]).join(', ');

  // Sensory
  const sFindings = present(([["vib", t.vibration], ["pt", t.painTouch], ["jp", t.jointPosition]] as const).map(([prefix, label]) => {
    const severity = sensoryValue(state, prefix, "Severity") as Severity;
    const count = sensoryValue(state, prefix, "Count") as number;
    return severity !== 'normal' && count > 0 && `${label} ${severityText(severity, t)} ${count} ${t.limbs}`;
  })).join(', ');

  const bbConverted = convertBBForEDSS(fs.BB);

  const lines = [
    `EDSS ${edss.toFixed(1)}`,
    `${t.ambulationScore} ${result.ambulation?.score ?? 0} (${ambFinding})`,
    `${fsWithOverride('P')}${withFindings(pFlags)}`,
    `${fsWithOverride('V')}${fs.V !== vConverted ? ` (${t.corrected}: ${vConverted})` : ''}${vAbnormal ? ` (${vFindings})` : ''}`,
    `${fsWithOverride('BS')}${withFindings(bsFindings)}`,
    `${fsWithOverride('C')}${withFindings(cerebellarFindings(state, t).join(', '))}`,
    `${fsWithOverride('S')}${withFindings(sFindings)}`,
    `${fsWithOverride('BB')}${fs.BB !== bbConverted ? ` (${t.corrected}: ${bbConverted})` : ''}${withFindings(bowelBladderFindings(state, t).join(', '))}`,
    `${fsWithOverride('M')}${withFindings(mentalFindings(state, t).join(', '))}`,
  ];
  if (previous) {
    lines.push(`${t.previousVisit}: EDSS ${previous.result.edss.toFixed(1)} → ${edss.toFixed(1)} (${signed(edss - previous.result.edss)})`);
  }
  return lines.join('\n');
}

export function buildExaminationText(state: FormState, assessment: Assessment, t: Translations): string {
  const { visual, brainstem, pyramidal } = state;
  const sections: string[] = [];

  // Visual
  const bothEyesNormal = visual.leftEyeAcuity === "1.0" && visual.rightEyeAcuity === "1.0";
  const extras = visualExtras(state, t);
  if (bothEyesNormal && extras.length === 0) {
    sections.push(t.visualExamNormal + '.');
  } else if (bothEyesNormal) {
    sections.push(`${t.visualAcuity} ${t.sensNormal.toLowerCase()}, ${extras.join(', ')}.`);
  } else {
    const acuityText = `${t.rightEye} ${formatEyeAcuity(visual.rightEyeAcuity)}, ${t.leftEye} ${formatEyeAcuity(visual.leftEyeAcuity)}`;
    sections.push([acuityText, ...extras].join(', ') + '.');
  }

  // Brainstem
  const sideLevels = (left: number, right: number) => present([
    right > 0 && `${t.rightAbbrev} (${t.level} ${right})`,
    left > 0 && `${t.leftAbbrev} (${t.level} ${left})`,
  ]);
  const facialSens = sideLevels(brainstem.facialSensLeft, brainstem.facialSensRight);
  const facialSym = sideLevels(brainstem.facialSymLeft, brainstem.facialSymRight);
  const hearing = sideLevels(brainstem.hearingLeft, brainstem.hearingRight);
  const bsParts = present([
    brainstem.eyeMotilityLevel > 0 && `${t.eyeMotilityImpairment} (${t.level} ${brainstem.eyeMotilityLevel})`,
    nystagmusText(state, t),
    brainstem.ino && t.inoPresent,
    facialSens.length > 0 && `${t.facialSensibilityDeficit} ${facialSens.join(', ')}`,
    facialSym.length > 0 && `${t.facialAsymmetry} ${facialSym.join(', ')}`,
    hearing.length > 0 && `${t.hearingImpairment} ${hearing.join(', ')}`,
    brainstem.dysarthriaLevel > 0 && `${t.dysarthria.toLowerCase()} (${t.level} ${brainstem.dysarthriaLevel})`,
    brainstem.dysphagiaLevel > 0 && `${t.dysphagia.toLowerCase()} (${t.level} ${brainstem.dysphagiaLevel})`,
    brainstem.otherCranialNerves > 0 && `${t.otherCranialNerveDeficit} (${t.level} ${brainstem.otherCranialNerves})`,
  ]);
  sections.push(bsParts.length > 0 ? capitalize(bsParts.join(', ')) + '.' : t.brainstemExamNormal + '.');

  // Pyramidal: "grade X for [side] [muscle group]", or "grade X for [muscle group] bilaterally"
  const weaknessFindings: string[] = [];
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
  const sideWord = (left: boolean, right: boolean) => left && right ? t.bilaterally : right ? t.right : t.left;
  const umnSigns = present([
    (pyramidal.hyperreflexiaLeft || pyramidal.hyperreflexiaRight) && `${t.hyperreflexia.toLowerCase()} ${sideWord(pyramidal.hyperreflexiaLeft, pyramidal.hyperreflexiaRight)}`,
    (pyramidal.babinskiLeft || pyramidal.babinskiRight) && `${t.positiveBarbinskiSign} ${sideWord(pyramidal.babinskiLeft, pyramidal.babinskiRight)}`,
    (pyramidal.clonusLeft || pyramidal.clonusRight) && `${t.clonus.toLowerCase()} ${sideWord(pyramidal.clonusLeft, pyramidal.clonusRight)}`,
    pyramidal.spasticGait && t.spasticGaitText,
    pyramidal.fatigability && t.fatigability.toLowerCase(),
  ]);
  if (weaknessFindings.length > 0 || umnSigns.length > 0) {
    sections.push(present([
      weaknessFindings.length > 0 && `${t.reducedStrength} ${joinWithAnd(weaknessFindings, t.and)}`,
      umnSigns.length > 0 && capitalize(umnSigns.join(', ')),
    ]).join(', ') + '.');
  } else {
    sections.push(t.withFullStrength + '.');
  }

  // Cerebellar
  const cParts = cerebellarFindings(state, t);
  sections.push(cParts.length > 0 ? capitalize(cParts.join(', ')) + '.' : t.cerebellarExamNormal + '.');

  // Sensory
  const limbNames = { RightArm: t.rightArm, LeftArm: t.leftArm, RightLeg: t.rightLeg, LeftLeg: t.leftLeg };
  const sParts = present(([["vib", t.vibrationSenseDeficit], ["pt", t.painTouchDeficit], ["jp", t.jointPositionDeficit]] as const).map(([prefix, deficitText]) => {
    const severity = sensoryValue(state, prefix, "Severity") as Severity;
    const count = sensoryValue(state, prefix, "Count") as number;
    if (severity === 'normal' || count === 0) return false;
    const limbs = LIMB_KEYS.filter((limb) => sensoryValue(state, prefix, limb)).map((limb) => limbNames[limb]);
    return `${severityText(severity, t)} ${deficitText} ${joinWithAnd(limbs, t.and)}`;
  }));
  sections.push(sParts.length > 0 ? capitalize(sParts.join(', ')) + '.' : t.sensoryExaminationNormal + '.');

  // Bowel/Bladder
  const bbParts = bowelBladderFindings(state, t);
  sections.push(bbParts.length > 0 ? capitalize(bbParts.join(', ')) + '.' : t.bowelBladderNormal + '.');

  // Cerebral
  const mParts = mentalFindings(state, t);
  sections.push(mParts.length > 0 ? capitalize(mParts.join(', ')) + '.' : t.cognitiveNormal + '.');

  // Ambulation
  if (state.assistance === 'none') {
    const rawDistance = Number(state.walkingDistance);
    const restricted = walkingRestrictedApplies(state, assessment) ? `, ${t.walkingRangeRestricted}` : '';
    if (Number.isFinite(rawDistance) && rawDistance > 2000) {
      sections.push(capitalize(`${t.walkingDistanceNotLimited}${restricted}.`));
    } else {
      sections.push(capitalize(`${t.walks} ${assessment.distance ?? t.unknown} ${t.meters} ${t.withoutAssistance}${restricted}.`));
    }
  } else {
    sections.push(capitalize(assistanceLabel(state.assistance, t)) + '.');
  }

  sections.push(`EDSS: ${assessment.result.edss.toFixed(1)}`);
  return sections.join(' ');
}
