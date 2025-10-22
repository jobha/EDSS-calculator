import React, { useEffect, useMemo, useState } from "react";

// ============================================================================
// TRANSLATIONS
// ============================================================================
type Language = 'en' | 'no';

const translations = {
  en: {
    title: "EDSS Calculator",
    reset: "Reset",
    overrideScore: "Override score",
    quickSummary: "Quick Summary",
    copySummary: "Copy summary",
    copied: "Copied ✓",
    fullExamText: "Full Examination Text",
    copyExamText: "Copy examination text",
    ambulation: "Ambulation",
    assistanceReq: "Assistance requirement",
    maxWalkDist: "Max walking distance without aid/rest (meters)",
    thresholds: "Thresholds: ≥500m (EDSS based on FS), 300-499m (4.5), 200-299m (5.0), 100-199m (5.5), <100m (6.0)",
    rawFS: "Raw FS",
    correctedFS: "Corrected FS (for EDSS)",
    // Visual
    leftEyeAcuity: "Left eye acuity",
    rightEyeAcuity: "Right eye acuity",
    visualFieldDeficit: "Visual field deficit",
    vfNone: "None",
    vfMild: "Mild (only on testing)",
    vfModerate: "Moderate (patient notices deficit or complete hemianopia)",
    vfMarked: "Marked (complete hemianopia)",
    // Brainstem
    eyeMotility: "Eye motility",
    eyeMotility0: "0 - Normal",
    eyeMotility1: "1 - Subtle findings, no symptoms",
    eyeMotility2: "2 - Subtle findings (patient aware) or clear incomplete paresis (patient unaware)",
    eyeMotility3: "3 - Clear incomplete paresis (patient aware) or complete loss in one direction",
    eyeMotility4: "4 - Complete loss in multiple directions",
    nystagmus: "Nystagmus",
    nystagmus0: "0 - None",
    nystagmus1: "1 - Mild gaze-evoked nystagmus",
    nystagmus2: "2 - Clear gaze-evoked nystagmus",
    nystagmus3: "3 - Spontaneous nystagmus or complete INO",
    facialSensibility: "Facial sensibility",
    facialSensibility0: "0 - Normal",
    facialSensibility1: "1 - Signs only",
    facialSensibility2: "2 - Decreased sensation",
    facialSensibility3: "3 - Decreased discrimination or trigeminal neuralgia >24h",
    facialSensibility4: "4 - Complete sensory loss (uni/bilateral)",
    facialSymmetry: "Facial symmetry",
    facialSymmetry0: "0 - Normal",
    facialSymmetry1: "1 - Signs only",
    facialSymmetry2: "2 - Decreased facial strength",
    facialSymmetry3: "3 - Incomplete facial palsy (eye patch at night or drooling)",
    facialSymmetry4: "4 - Complete uni/bilateral facial palsy",
    hearing: "Hearing",
    hearing0: "0 - Normal",
    hearing1: "1 - Reduced hearing (finger rub) or Weber lateralization, no symptoms",
    hearing2: "2 - Findings with patient awareness",
    hearing3: "3 - Cannot hear finger rub or difficulty with whisper",
    hearing4: "4 - Cannot hear whisper",
    dysarthria: "Dysarthria",
    dysarthria0: "0 - Normal",
    dysarthria1: "1 - Slurred speech (patient aware)",
    dysarthria2: "2 - Difficult to understand due to slurring",
    dysarthria3: "3 - Incomprehensible speech",
    dysarthria4: "4 - Unable to speak",
    dysphagia: "Dysphagia",
    dysphagia0: "0 - Normal",
    dysphagia1: "1 - Difficulty swallowing liquids",
    dysphagia2: "2 - Difficulty swallowing liquids and solids",
    dysphagia3: "3 - Marked difficulty (dependent on pureed food)",
    dysphagia4: "4 - Unable to swallow",
    // Pyramidal
    upperLimbsMRC: "Upper limbs (muscle strength grade 0–5)",
    lowerLimbsMRC: "Lower limbs (muscle strength grade 0–5)",
    movement: "Movement",
    findings: "Findings",
    shoulderAbduction: "Shoulder abduction",
    shoulderExternalRotation: "Shoulder external rotation",
    elbowFlexion: "Elbow flexion",
    elbowExtension: "Elbow extension",
    wristExtension: "Wrist extension",
    fingerAbduction: "Finger abduction",
    hipFlexion: "Hip flexion",
    hipAbduction: "Hip abduction",
    kneeExtension: "Knee extension",
    kneeFlexion: "Knee flexion",
    ankleDorsiflexion: "Ankle dorsiflexion",
    anklePlantarflexion: "Ankle plantarflexion",
    hyperreflexia: "Hyperreflexia",
    babinski: "Babinski",
    clonus: "Clonus",
    spasticGait: "Spastic gait",
    fatigability: "Fatigability",
    // Movement components for narrative formatting
    movements: {
      shoulder: "shoulder", elbow: "elbow", wrist: "wrist", finger: "finger",
      hip: "hip", knee: "knee", ankle: "ankle",
      abduction: "abduction", externalRotation: "external rotation",
      flexion: "flexion", extension: "extension",
      dorsiflexion: "dorsiflexion", plantarflexion: "plantarflexion"
    },
    // Cerebellar
    minimalImpact: "Minimal impact",
    functionalImpact: "Functional impact / severe",
    tremorAtaxiaCoord: "Tremor/ataxia on coordination tests",
    rombergFall: "Fall tendency on Romberg",
    tandemDifficulty: "Difficulty on tandem/line walk",
    mildCerebellarSigns: "Mild signs without functional loss",
    limbAtaxiaFunction: "Moderate limb ataxia affecting function",
    gaitAtaxia: "Gait ataxia",
    truncalAtaxia: "Truncal ataxia (eyes open)",
    ataxia34Limbs: "Pronounced ataxia in 3–4 limbs",
    needsAssistanceAtaxia: "Needs assistance due to ataxia",
    unableCoordMovements: "Unable to perform coordinated movements due to ataxia",
    // Sensory
    vibration: "Vibration",
    painTouch: "Pain / Touch",
    jointPosition: "Joint Position",
    severity: "Severity",
    numLimbs: "Number of limbs (0–4)",
    sensNormal: "normal",
    sensMild: "mild",
    sensModerate: "moderate",
    sensMarked: "marked",
    sensAbsent: "absent",
    // Bowel/Bladder
    bladderSymptoms: "Bladder symptoms",
    bowelSymptoms: "Bowel symptoms",
    mildUrge: "Mild urge",
    moderateUrge: "Moderate urge",
    rareIncontinence: "Rare incontinence",
    frequentIncontinence: "Frequent incontinence",
    intermittentCath: "Intermittent catheterization",
    permanentCath: "Permanent catheter",
    lossBladderFunction: "Loss of bladder function",
    mildConstipation: "Mild constipation",
    moderateConstipation: "Moderate constipation",
    severeConstipation: "Severe constipation",
    needsHelpBM: "Needs help for bowel movement",
    bowelIncontinenceWeekly: "Bowel incontinence weekly",
    lossBowelFunction: "Loss of bowel function",
    // Mental
    fatigue: "Fatigue",
    cognitiveFunction: "Cognitive function",
    mildFatigue: "Mild fatigue (affects <50% of daily activity or work)",
    moderateSevereFatigue: "Moderate to severe fatigue (affects ≥50% of daily activity or work)",
    lightlyReducedCog: "Lightly reduced cognition",
    moderatelyReducedCog: "Moderately reduced cognition (reduced test performance, oriented 3/3)",
    markedlyReducedCog: "Markedly reduced cognition (not oriented for 1-2 of 3 dimensions)",
    pronouncedDementia: "Pronounced dementia (confusion, totally disoriented)",
    // Assistance levels
    noAssistance: "No assistance required",
    uniAid50Plus: "Unilateral aid (cane/crutch), walks ≥50 m",
    uniAidUnder50: "Unilateral aid (cane/crutch), walks <50 m",
    biAid120Plus: "Bilateral aid (two canes/crutches/walker), walks ≥120 m",
    biAid5to120: "Bilateral aid, walks ≥5 m but <120 m",
    biAidUnder5: "Bilateral aid, walks <5 m",
    wheelSelf: "Wheelchair; self-propels and transfers independently",
    wheelSomeHelp: "Wheelchair; needs some help with transfers, self-propels",
    wheelDependent: "Wheelchair; completely dependent for transfers and propulsion",
    bedChairArmsOk: "Bed/chair; arms effective; mostly self-care",
    bedChairLimitedArms: "Bed-bound; limited arm use; some self-care",
    helpless: "Helpless; cannot communicate/eat effectively",
    totalCare: "Totally helpless; total care incl. feeding",
    // Examination narrative text
    visualAcuity: "Visual acuity",
    leftEye: "Left eye",
    rightEye: "Right eye",
    noVisualFieldDeficits: "No visual field deficits",
    visualFieldDeficitText: "visual field deficit",
    visualExamNormal: "Normal visual acuity, no visual field deficits",
    brainstemExamNormal: "Brainstem examination normal",
    brainstem: "Brainstem",
    eyeMotilityImpairment: "eye motility impairment",
    level: "level",
    facialSensibilityDeficit: "facial sensibility deficit",
    facialAsymmetry: "facial asymmetry",
    hearingImpairment: "hearing impairment",
    motorExamination: "Motor examination",
    normal: "normal",
    withFullStrength: "strength throughout and no upper motor neuron signs",
    reducedStrength: "Reduced strength",
    grade: "grade",
    for: "for",
    and: "and",
    bilaterally: "bilaterally",
    right: "right",
    left: "left",
    positiveBarbinskiSign: "positive Babinski sign",
    spasticGaitText: "spastic gait",
    cerebellarExamNormal: "Cerebellar examination normal",
    cerebellar: "Cerebellar",
    unableCoordMovementsText: "unable to perform coordinated movements",
    ataxiaIn34Limbs: "ataxia in 3-4 limbs",
    needsAssistanceAtaxiaText: "needs assistance due to ataxia",
    limbAtaxiaAffectingFunction: "limb ataxia affecting function",
    gaitAtaxiaText: "gait ataxia",
    truncalAtaxiaText: "truncal ataxia",
    tremorAtaxiaCoordTesting: "tremor/ataxia on coordination testing",
    fallTendencyRomberg: "fall tendency on Romberg",
    tandemGaitDifficulty: "tandem gait difficulty",
    mildCerebellarSignsNoFunction: "mild cerebellar signs without functional impact",
    sensoryExaminationNormal: "Normal sensory",
    sensoryExamination: "Sensory examination",
    vibrationSenseDeficit: "vibration sense deficit in",
    painTouchDeficit: "pain/touch deficit in",
    jointPositionDeficit: "joint position sense deficit in",
    limbS: "limb(s)",
    rightArm: "right arm",
    leftArm: "left arm",
    rightLeg: "right leg",
    leftLeg: "left leg",
    bowelBladderNormal: "Bowel and bladder function normal",
    bladderFunction: "Bladder",
    bowelFunction: "Bowel",
    cognitiveNormal: "Cognitive function and mood normal",
    cognitive: "Cognitive",
    ambulationText: "Ambulation",
    walks: "walks",
    meters: "meters",
    withoutAssistance: "without assistance",
    unknown: "unknown",
  },
  no: {
    title: "EDSS-Kalkulator",
    reset: "Tilbakestill",
    overrideScore: "Overstyr skår",
    quickSummary: "Hurtigsammendrag",
    copySummary: "Kopier sammendrag",
    copied: "Kopiert ✓",
    fullExamText: "Fullstendig undersøkelsestekst",
    copyExamText: "Kopier undersøkelsestekst",
    ambulation: "Gange",
    assistanceReq: "Hjelpebehov",
    maxWalkDist: "Maksimal gangdistanse uten hjelpemiddel/hvile (meter)",
    thresholds: "Terskler: ≥500m (EDSS basert på FS), 300-499m (4.5), 200-299m (5.0), 100-199m (5.5), <100m (6.0)",
    rawFS: "Rå FS",
    correctedFS: "Korrigert FS (for EDSS)",
    // Visual
    leftEyeAcuity: "Venstre øye synsstyrke",
    rightEyeAcuity: "Høyre øye synsstyrke",
    visualFieldDeficit: "Synsfeltutfall",
    vfNone: "Ingen",
    vfMild: "Mild (kun ved testing)",
    vfModerate: "Moderat (pasient merker utfall / komplett hemianopsi)",
    vfMarked: "Markert (komplett hemianopsi)",
    // Brainstem
    eyeMotility: "Øyemotilitet",
    eyeMotility0: "0 - Normal",
    eyeMotility1: "1 - Subtile funn på øyemotilitetsforstyrrelse, uten at pasient selv bemerker plager",
    eyeMotility2: "2 - Subtile funn som pasient er kjent med eller tydelige inkomplette øyemuskelpareser som pasient ikke er kjent med",
    eyeMotility3: "3 - Tydelig inkomplette øyemuskelpareser som pasient er kjent med eller komplett tap av bevegelse i en blikkretning",
    eyeMotility4: "4 - Komplett tap av bevegelse i flere retninger",
    nystagmus: "Nystagmus",
    nystagmus0: "0 - Ingen",
    nystagmus1: "1 - Mild blikkretningsnystagmus",
    nystagmus2: "2 - Tydelig blikkretningsnystagmus",
    nystagmus3: "3 - Spontannystagmus eller komplett internukleær oftalmoplegi",
    facialSensibility: "Ansiktssensibilitet",
    facialSensibility0: "0 - Normal",
    facialSensibility1: "1 - Kun tegn",
    facialSensibility2: "2 - Nedsatt følelse",
    facialSensibility3: "3 - Nedsatt diskriminering mellom stikk og lett berøring i forsyningsområdet til minst en trigeminusgren eller trigeminusnevralgi > 24 timer",
    facialSensibility4: "4 - Bortfall av sensibilitet for stikk/lett berøring i hele nervens utbredelse uni- eller bilateralt",
    facialSymmetry: "Ansiktssymmetri",
    facialSymmetry0: "0 - Normal",
    facialSymmetry1: "1 - Kun tegn",
    facialSymmetry2: "2 - Nedsatt kraft i ansiktsmusklatur",
    facialSymmetry3: "3 - Inkomplett ansiktslammelse (som resulterer i bruk av øyelapp på natt eller sikling)",
    facialSymmetry4: "4 - Komplett uni- eller bilateral ansiktslammelse",
    hearing: "Hørsel",
    hearing0: "0 - Normal",
    hearing1: "1 - Redusert hørsel for fingergnissing eller lateralisering på Weber uten at pasient selv bemerker plager",
    hearing2: "2 - Funn hvor pasient selv bemerker problem",
    hearing3: "3 - Hører ikke fingergniss eller vansker med å oppfatte hvisking",
    hearing4: "4 - Hører ikke hvisking",
    dysarthria: "Dysartri",
    dysarthria0: "0 - Normal",
    dysarthria1: "1 - Snøvlete tale som pasient er klar over",
    dysarthria2: "2 - Vanskelig forståelig tale grunnet snøvling",
    dysarthria3: "3 - Ubegripelig tale",
    dysarthria4: "4 - Manglende evne til tale",
    dysphagia: "Dysfagi",
    dysphagia0: "0 - Normal",
    dysphagia1: "1 - Vansker med å svelge væske",
    dysphagia2: "2 - Vansker med å svelge væske og fast føde",
    dysphagia3: "3 - Markerte vansker med svelging (avhengig av most mat)",
    dysphagia4: "4 - Manglende evne til svelging",
    // Pyramidal
    upperLimbsMRC: "Overekstremiteter (Muskelkraft grad 0–5)",
    lowerLimbsMRC: "Underekstremiteter (Muskelkraft grad 0–5)",
    movement: "Bevegelse",
    findings: "Funn",
    shoulderAbduction: "Skulder abduksjon",
    shoulderExternalRotation: "Skulder utadrotasjon",
    elbowFlexion: "Albue fleksjon",
    elbowExtension: "Albue ekstensjon",
    wristExtension: "Håndledd ekstensjon",
    fingerAbduction: "Finger abduksjon",
    hipFlexion: "Hofte fleksjon",
    hipAbduction: "Hofte abduksjon",
    kneeExtension: "Kne ekstensjon",
    kneeFlexion: "Kne fleksjon",
    ankleDorsiflexion: "Ankel dorsalfleksjon",
    anklePlantarflexion: "Ankel plantarfleksjon",
    hyperreflexia: "Hyperrefleksi",
    babinski: "Babinski",
    clonus: "Klonus",
    spasticGait: "Spastisk gange",
    fatigability: "Utmattbarhet",
    // Movement components for narrative formatting
    movements: {
      shoulder: "skulder", elbow: "albue", wrist: "håndledd", finger: "finger",
      hip: "hofte", knee: "kne", ankle: "ankel",
      abduction: "abduksjon", externalRotation: "utadrotasjon",
      flexion: "fleksjon", extension: "ekstensjon",
      dorsiflexion: "dorsalfleksjon", plantarflexion: "plantarfleksjon"
    },
    // Cerebellar
    minimalImpact: "Minimal påvirkning",
    functionalImpact: "Funksjonsnedsettelse / alvorlig",
    tremorAtaxiaCoord: "Tremor/ataksi på koordinasjonstester",
    rombergFall: "Falltendens ved Romberg",
    tandemDifficulty: "Vansker med tandemgang/linjegang",
    mildCerebellarSigns: "Milde cerebellære tegn uten funksjonsnedsettelse",
    limbAtaxiaFunction: "Moderat ekstremitetsataksi som påvirker funksjon",
    gaitAtaxia: "Gangataksi",
    truncalAtaxia: "Trunkal ataksi (øyne åpne)",
    ataxia34Limbs: "Uttalt ataksi i 3–4 ekstremiteter",
    needsAssistanceAtaxia: "Trenger hjelp på grunn av ataksi",
    unableCoordMovements: "Ute av stand til å utføre koordinerte bevegelser på grunn av ataksi",
    // Sensory
    vibration: "Vibrasjonssans",
    painTouch: "Smerte / Berøring",
    jointPosition: "Leddsans",
    severity: "Grad",
    numLimbs: "Antall ekstremiteter (0–4)",
    sensNormal: "normal",
    sensMild: "mild",
    sensModerate: "moderat",
    sensMarked: "markert",
    sensAbsent: "fraværende",
    // Bowel/Bladder
    bladderSymptoms: "Blæresymptomer",
    bowelSymptoms: "Tarmsymptomer",
    mildUrge: "Mild urge",
    moderateUrge: "Moderat urge",
    rareIncontinence: "Sjelden inkontinens",
    frequentIncontinence: "Hyppig inkontinens",
    intermittentCath: "Intermitterende kateterisering",
    permanentCath: "Fast kateter",
    lossBladderFunction: "Tap av blærefunksjon",
    mildConstipation: "Mild forstoppelse",
    moderateConstipation: "Moderat forstoppelse",
    severeConstipation: "Alvorlig forstoppelse",
    needsHelpBM: "Trenger hjelp til avføring",
    bowelIncontinenceWeekly: "Tarminkontinens ukentlig",
    lossBowelFunction: "Tap av tarmfunksjon",
    // Mental
    fatigue: "Utmattelse",
    cognitiveFunction: "Kognitiv funksjon",
    mildFatigue: "Mild utmattelse (påvirker <50% av daglig aktivitet eller arbeid)",
    moderateSevereFatigue: "Moderat til alvorlig utmattelse (påvirker ≥50% av daglig aktivitet eller arbeid)",
    lightlyReducedCog: "Lett redusert kognisjon",
    moderatelyReducedCog: "Moderat redusert kognisjon (redusert testytelse, orientert 3/3)",
    markedlyReducedCog: "Markert redusert kognisjon (ikke orientert for 1-2 av 3 dimensjoner)",
    pronouncedDementia: "Uttalt demens (forvirring, totalt desorientert)",
    // Assistance levels
    noAssistance: "Ingen hjelpemidler nødvendig",
    uniAid50Plus: "Ensidig ganghjelpemiddel (stokk/krykke), går ≥50 m",
    uniAidUnder50: "Ensidig ganghjelpemiddel (stokk/krykke), går <50 m",
    biAid120Plus: "Bilaterale ganghjelpemidler (to stokker/krykker/rullator), går ≥120 m",
    biAid5to120: "Bilaterale ganghjelpemidler, går ≥5 m men <120 m",
    biAidUnder5: "Bilaterale ganghjelpemidler, går <5 m",
    wheelSelf: "Rullestol; kjører og forflytter seg til og fra, samt opp av og ned i rullestol selv",
    wheelSomeHelp: "Rullestol; behov for noe hjelp ved forflytning til og fra, samt opp av og ned i rullestol, men kjører den manuelle rullestolen selv",
    wheelDependent: "Rullestol; helt hjelpetrengende angående rullestol, samt å kjøre den",
    bedChairArmsOk: "Seng/stol; armer fungerer; mesteparten selvhjulpen",
    bedChairLimitedArms: "Sengeliggende; begrenset armbruk; noe selvhjelp",
    helpless: "Hjelpeløs; kan ikke kommunisere/spise effektivt",
    totalCare: "Totalt hjelpeløs; total omsorg inkl. mating",
    // Examination narrative text
    visualAcuity: "Synsstyrke",
    leftEye: "Venstre øye",
    rightEye: "Høyre øye",
    noVisualFieldDeficits: "Ingen synsfeltutfall",
    visualFieldDeficitText: "synsfeltutfall",
    visualExamNormal: "Normal visus, ingen synsfeltdefekter",
    brainstemExamNormal: "Hjernestammeundersøkelse normal",
    brainstem: "Hjernestamme",
    eyeMotilityImpairment: "øyemotilitetssvikt",
    level: "nivå",
    facialSensibilityDeficit: "ansiktssensibilitetsutfall",
    facialAsymmetry: "ansiktsasymmetri",
    hearingImpairment: "hørselssvekkelse",
    motorExamination: "Motorisk undersøkelse",
    normal: "normal",
    withFullStrength: "kraft gjennomgående og ingen øvre motornevronfunn",
    reducedStrength: "Redusert kraft",
    grade: "grad",
    for: "for",
    and: "og",
    bilaterally: "bilateralt",
    right: "høyre",
    left: "venstre",
    positiveBarbinskiSign: "positiv Babinski-refleks",
    spasticGaitText: "spastisk gange",
    cerebellarExamNormal: "Cerebellær undersøkelse normal",
    cerebellar: "Cerebellær",
    unableCoordMovementsText: "ute av stand til å utføre koordinerte bevegelser",
    ataxiaIn34Limbs: "ataksi i 3-4 ekstremiteter",
    needsAssistanceAtaxiaText: "trenger hjelp på grunn av ataksi",
    limbAtaxiaAffectingFunction: "ekstremitetsataksi som påvirker funksjon",
    gaitAtaxiaText: "gangataksi",
    truncalAtaxiaText: "trunkal ataksi",
    tremorAtaxiaCoordTesting: "tremor/ataksi ved koordinasjonstesting",
    fallTendencyRomberg: "falltendens ved Romberg",
    tandemGaitDifficulty: "vansker med tandemgang",
    mildCerebellarSignsNoFunction: "milde cerebellære tegn uten funksjonsnedsettelse",
    sensoryExaminationNormal: "Normal sensorikk",
    sensoryExamination: "Sensorisk undersøkelse",
    vibrationSenseDeficit: "vibrasjonssansutfall i",
    painTouchDeficit: "smerte/berøringsutfall i",
    jointPositionDeficit: "leddsansutfall i",
    limbS: "ekstremitet(er)",
    rightArm: "høyre arm",
    leftArm: "venstre arm",
    rightLeg: "høyre ben",
    leftLeg: "venstre ben",
    bowelBladderNormal: "Tarm- og blærefunksjon normal",
    bladderFunction: "Blære",
    bowelFunction: "Tarm",
    cognitiveNormal: "Kognitiv funksjon og stemningsleie normalt",
    cognitive: "Kognitiv",
    ambulationText: "Gange",
    walks: "går",
    meters: "meter",
    withoutAssistance: "uten hjelpemidler",
    unknown: "ukjent",
  }
};

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

const assistanceLevelIds = ["none", "uni_50_plus", "uni_under_50", "bi_120_plus", "bi_5_to_120", "bi_under_5", "wheel_self", "wheel_some_help", "wheel_dependent", "bed_chair_arms_ok", "bed_chair_limited_arms", "helpless", "total_care"] as const;

type AssistanceId = typeof assistanceLevelIds[number];

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
    const babinskiSides = [];
    if (pyramidal.babinskiLeft) babinskiSides.push('L');
    if (pyramidal.babinskiRight) babinskiSides.push('R');
    const babinskiText = babinskiSides.length > 0 ? `Babinski ${babinskiSides.join('+')}` : '';

    const pFlags = [
      pyramidal.spasticGait && 'spastic gait',
      babinskiText,
      pyramidal.fatigability && 'fatigue'
    ].filter(Boolean).join(', ');
    const pSummary = pFlags || (minMRC < 5 ? `min grade ${minMRC}` : 'normal');

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
      sParts.push(`${getSensText(sensory.vibSeverity)} ${t.vibrationSenseDeficit} ${limbList}`);
    }
    if (sensory.ptSeverity !== 'normal' && sensory.ptCount > 0) {
      const limbList = getLimbList(sensory.ptRightArm, sensory.ptLeftArm, sensory.ptRightLeg, sensory.ptLeftLeg);
      sParts.push(`${getSensText(sensory.ptSeverity)} ${t.painTouchDeficit} ${limbList}`);
    }
    if (sensory.jpSeverity !== 'normal' && sensory.jpCount > 0) {
      const limbList = getLimbList(sensory.jpRightArm, sensory.jpLeftArm, sensory.jpRightLeg, sensory.jpLeftLeg);
      sParts.push(`${getSensText(sensory.jpSeverity)} ${t.jointPositionDeficit} ${limbList}`);
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
            <label className="text-xs opacity-70">{t.overrideScore}</label>
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
          <FSRow code="V">
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
          </FSRow>

          {/* BS */}
          <FSRow code="BS">
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
          </FSRow>

          {/* P — Registry-style */}
          <FSRow code="P">
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
          </FSRow>

          {/* C */}
          <FSRow code="C">
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
          </FSRow>

          {/* S — Registry-style */}
          <FSRow code="S">
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
          </FSRow>

          {/* BB */}
          <FSRow code="BB">
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
          </FSRow>

          {/* M */}
          <FSRow code="M">
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
          </FSRow>

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
              <div className="mt-2 text-sm opacity-80">{result.rationale.replace(/;\s*guarded by FS/g, '')}</div>
              <div className="mt-4 text-xs opacity-70">
                <div>{t.rawFS}: {countFS(0)}×0, {countFS(1)}×1, {countFS(2)}×2, {countFS(3)}×3, {countFS(4)}×4, {countFS(5)}×5, {countFS(6)}×6</div>
                <div className="mt-1">{t.correctedFS}: {countCorrectedFS(0)}×0, {countCorrectedFS(1)}×1, {countCorrectedFS(2)}×2, {countCorrectedFS(3)}×3, {countCorrectedFS(4)}×4, {countCorrectedFS(5)}×5</div>
              </div>

              <div className="mt-6 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">{t.quickSummary}</div>
                <pre className="whitespace-pre-wrap text-xs">{summary}</pre>
                <button onClick={copySummary} className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copied ? t.copied : t.copySummary}</button>
              </div>

              <div className="mt-4 p-3 rounded-xl border bg-gray-50">
                <div className="text-xs font-semibold mb-2">{t.fullExamText}</div>
                <pre className="whitespace-pre-wrap text-xs">{examinationText}</pre>
                <button onClick={copyExamination} className="mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{copiedExam ? t.copied : t.copyExamText}</button>
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
}