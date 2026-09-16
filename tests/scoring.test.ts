// Checks the calculator against the Neurostatus scoring table (04/10.3) and definitions (04/10.2).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEDSSFromInputs, computeFSStep, convertBBForEDSS, convertVisualForEDSS, correctedFS } from "../src/utils/edss";
import { suggestBB, suggestBS, suggestC, suggestM, suggestP, suggestS, suggestV } from "../src/utils/scoring";
import { DEFAULT_STATE, migrateState } from "../src/utils/state";
import type { BowelBladderForm, BrainstemForm, CerebellarForm, MentalForm, PyramidalForm, SensoryForm, VisualForm } from "../src/types/forms";

const FS_KEYS = ["V", "BS", "P", "C", "S", "BB", "M"];
const fsFrom = (grades: number[]) => Object.fromEntries(FS_KEYS.map((k, i) => [k, grades[i] ?? 0]));
// EDSS from already converted FS grades, fully ambulatory
const step = (...grades: number[]) => computeFSStep(fsFrom(grades)).edss;

test("FS conversions", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(convertVisualForEDSS), [0, 1, 2, 2, 3, 3, 4]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(convertBBForEDSS), [0, 1, 2, 3, 3, 4, 5]);
  assert.deepEqual(correctedFS({ V: 6, BS: 1, P: 2, C: 3, S: 4, BB: 6, M: 5 }), { V: 4, BS: 1, P: 2, C: 3, S: 4, BB: 5, M: 5 });
});

test("EDSS step: every line of the scoring table", () => {
  assert.equal(step(), 0);
  assert.equal(step(1), 1.0);
  assert.equal(step(1, 1), 1.5);
  assert.equal(step(1, 1, 1, 1, 1, 1, 1), 1.5);
  assert.equal(step(2, 1, 1), 2.0);
  assert.equal(step(2, 2), 2.5);
  assert.equal(step(2, 2, 2), 3.0);
  assert.equal(step(2, 2, 2, 2, 1), 3.0);
  assert.equal(step(3, 1, 1), 3.0);
  assert.equal(step(2, 2, 2, 2, 2), 3.5);
  assert.equal(step(3, 2), 3.5);
  assert.equal(step(3, 2, 2, 1), 3.5);
  assert.equal(step(3, 3, 1), 3.5);
  assert.equal(step(2, 2, 2, 2, 2, 2), 4.0);
  assert.equal(step(2, 2, 2, 2, 2, 2, 2), 4.0);
  assert.equal(step(3, 3, 2), 4.0);
  assert.equal(step(3, 3, 3), 4.0);
  assert.equal(step(3, 3, 3, 3, 2, 2, 2), 4.0);
  assert.equal(step(4, 1, 1), 4.0);
  assert.equal(step(3, 3, 3, 3, 3), 4.5);
  assert.equal(step(3, 3, 3, 3, 3, 2, 2), 4.5);
  assert.equal(step(4, 3), 4.5);
  assert.equal(step(4, 3, 3, 2, 2), 4.5);
  assert.equal(step(3, 3, 3, 3, 3, 3), 5.0);
  assert.equal(step(4, 4), 5.0);
  assert.equal(step(4, 4, 3, 3, 3), 5.0);
  assert.equal(step(5), 5.0);
  assert.equal(step(6, 1), 5.0);
});

test("EDSS step: combinations not listed in the table", () => {
  assert.equal(step(3, 2, 2, 2), 4.0); // exceeds 3.5 (1–2×2 + 1×3)
  assert.equal(step(4, 2), 4.5);       // exceeds 4.0 (1×4, others 0 or 1)
  assert.equal(step(4, 3, 3, 3), 5.0); // exceeds 4.5 (1–2×3 + 1×4)
});

test("EDSS step never decreases when any FS increases", () => {
  const grades = [0, 0, 0, 0, 0, 0, 0];
  const edssOf = (g: number[]) => computeFSStep(fsFrom(g)).edss;
  // Grades are order independent, so non-decreasing tuples are enough
  const walk = (i: number, min: number) => {
    if (i === 7) {
      const base = edssOf(grades);
      for (let j = 0; j < 7; j++) {
        if (grades[j] === 6) continue;
        grades[j]++;
        assert.ok(edssOf(grades) >= base, `raising FS ${j} of ${grades} lowered EDSS`);
        grades[j]--;
      }
      return;
    }
    for (let g = min; g <= 6; g++) { grades[i] = g; walk(i + 1, g); }
    grades[i] = 0;
  };
  walk(0, 0);
});

test("Ambulation", () => {
  const fs = fsFrom([0, 0, 0, 0, 0, 0, 0]);
  const edss = (a: Parameters<typeof computeEDSSFromInputs>[1], d: number | null, r = false, f = fs) => computeEDSSFromInputs(f, a, d, r).edss;
  assert.equal(edss("none", 800), 0);
  assert.equal(edss("none", null), 0);
  assert.equal(edss("none", 800, true), 2.0);          // fully ambulatory but restricted
  assert.equal(edss("none", 500, true, fsFrom([0, 0, 3, 3])), 3.5);
  assert.equal(edss("none", 499), 4.5);
  assert.equal(edss("none", 300, false, fsFrom([0, 0, 4, 4])), 5.0); // FS step higher than ambulation
  assert.equal(edss("none", 299), 5.0);
  assert.equal(edss("none", 200), 5.0);
  assert.equal(edss("none", 199, false, fsFrom([0, 0, 6, 6])), 5.5); // ≥ 5.5 defined by ambulation only
  assert.equal(edss("none", 100), 5.5);
  assert.equal(edss("none", 99), 6.0);
  assert.equal(edss("uni_50_plus", null), 6.0);
  assert.equal(edss("bi_120_plus", null), 6.0);
  assert.equal(edss("uni_under_50", null), 6.5);
  assert.equal(edss("bi_5_to_120", null), 6.5);
  assert.equal(edss("bi_under_5", null), 7.0);
  assert.equal(edss("wheel_self", null), 7.0);
  assert.equal(edss("wheel_some_help", null), 7.5);
  assert.equal(edss("wheel_dependent", null), 8.0);
  assert.equal(edss("bed_chair_arms_ok", null), 8.0);
  assert.equal(edss("bed_chair_limited_arms", null), 8.5);
  assert.equal(edss("helpless", null), 9.0);
  assert.equal(edss("total_care", null), 9.5);
  // Visual and bowel/bladder are converted before the step is determined
  assert.equal(edss("none", 1000, false, fsFrom([6, 0, 0, 0, 0, 6])), 5.0);
  assert.equal(edss("none", 1000, false, fsFrom([5, 0, 0, 0, 0, 5])), 4.5); // unconverted would be 5.0
});

const visual = (o: Partial<VisualForm>): VisualForm => ({ ...DEFAULT_STATE.visual, ...o });

test("Visual FS: acuity table", () => {
  const v = (worse: VisualForm["leftEyeAcuity"], better: VisualForm["leftEyeAcuity"]) => suggestV(visual({ leftEyeAcuity: worse, rightEyeAcuity: better }));
  assert.equal(v("1.0", "1.0"), 0);
  assert.equal(v("0.68-0.99", "1.0"), 1);
  assert.equal(v("0.68-0.99", "0.68-0.99"), 1);
  assert.equal(v("0.34-0.67", "0.34-0.67"), 2);
  assert.equal(v("0.21-0.33", "0.34-0.67"), 3);
  assert.equal(v("0.10-0.20", "1.0"), 4);
  assert.equal(v("0.21-0.33", "0.21-0.33"), 4);
  assert.equal(v("lt_0.10", "0.34-0.67"), 5);
  assert.equal(v("0.10-0.20", "0.21-0.33"), 5);
  assert.equal(v("0.10-0.20", "0.10-0.20"), 5);
  assert.equal(v("lt_0.10", "0.21-0.33"), 6);
  assert.equal(v("lt_0.10", "lt_0.10"), 6);
  assert.equal(v("1.0", "0.10-0.20"), 4); // side does not matter
});

test("Visual FS: fields, scotoma, disc pallor", () => {
  assert.equal(suggestV(visual({ visualFieldDeficit: "mild" })), 1);
  assert.equal(suggestV(visual({ visualFieldDeficit: "moderate" })), 3);
  assert.equal(suggestV(visual({ visualFieldDeficit: "marked" })), 4);
  assert.equal(suggestV(visual({ scotoma: 1 })), 1);
  assert.equal(suggestV(visual({ scotoma: 2 })), 3);
  assert.equal(suggestV(visual({ discPallor: true })), 1);
  assert.equal(suggestV(visual({ scotoma: 2, leftEyeAcuity: "0.21-0.33", rightEyeAcuity: "0.21-0.33" })), 4);
});

const brainstem = (o: Partial<BrainstemForm>): BrainstemForm => ({ ...DEFAULT_STATE.brainstem, ...o });

test("Brainstem FS", () => {
  assert.equal(suggestBS(brainstem({})), 0);
  assert.deepEqual(([0, 1, 2, 3, 4] as const).map((l) => suggestBS(brainstem({ eyeMotilityLevel: l }))), [0, 1, 2, 2, 3]);
  assert.equal(suggestBS(brainstem({ nystagmus: "mild" })), 1);
  assert.equal(suggestBS(brainstem({ nystagmus: "clear" })), 2);
  assert.equal(suggestBS(brainstem({ nystagmus: "spontaneous" })), 3);
  assert.deepEqual(([0, 1, 2, 3, 4, 5] as const).map((l) => suggestBS(brainstem({ dysarthriaLevel: l }))), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(([0, 1, 2, 3, 4, 5] as const).map((l) => suggestBS(brainstem({ dysphagiaLevel: l }))), [0, 1, 2, 3, 4, 5]);
  assert.equal(suggestBS(brainstem({ hearingRight: 3 })), 3);
  assert.equal(suggestBS(brainstem({ facialSymLeft: 4 })), 4);
  assert.equal(suggestBS(brainstem({ otherCranialNerves: 2 })), 2);
});

const pyramidal = (o: Partial<PyramidalForm>): PyramidalForm => ({ ...DEFAULT_STATE.pyramidal, ...o });
const legs = (grade: number, side: "R" | "L" | "RL" = "RL") => Object.fromEntries(
  ["hipFlexion", "hipAbduction", "kneeExtension", "kneeFlexion", "ankleDorsiflexion", "anklePlantarflexion"]
    .flatMap((m) => [...side].map((s) => [m + s, grade])));
const arms = (grade: number, side: "R" | "L" | "RL" = "RL") => Object.fromEntries(
  ["shoulderAbduction", "shoulderExternalRotation", "elbowFlexion", "elbowExtension", "wristExtension", "fingerAbduction"]
    .flatMap((m) => [...side].map((s) => [m + s, grade])));

test("Pyramidal FS", () => {
  assert.equal(suggestP(pyramidal({})), 0);
  assert.equal(suggestP(pyramidal({ babinskiLeft: true })), 1);
  assert.equal(suggestP(pyramidal({ fatigability: true })), 2);
  assert.equal(suggestP(pyramidal({ hipFlexionR: 4, hipFlexionL: 4 })), 2);
  assert.equal(suggestP(pyramidal({ hipFlexionR: 4, hipFlexionL: 4, ankleDorsiflexionL: 4 })), 3);
  assert.equal(suggestP(pyramidal({ hipFlexionR: 4, hipFlexionL: 4, ankleDorsiflexionL: 4, fatigability: true })), 3);
  assert.equal(suggestP(pyramidal({ hipFlexionR: 3 })), 3);
  assert.equal(suggestP(pyramidal({ ankleDorsiflexionR: 0 })), 3);         // severe monoparesis
  assert.equal(suggestP(pyramidal({ ...legs(3, "R"), ...arms(3, "R") })), 3); // moderate hemiparesis
  assert.equal(suggestP(pyramidal({ hipFlexionR: 2, hipFlexionL: 2 })), 4);   // marked paraparesis
  assert.equal(suggestP(pyramidal(legs(1, "R"))), 4);                        // monoplegia
  assert.equal(suggestP(pyramidal({ ...legs(3), elbowFlexionR: 3 })), 4);    // moderate tetraparesis
  assert.equal(suggestP(pyramidal(legs(0))), 5);                             // paraplegia
  assert.equal(suggestP(pyramidal({ ...legs(1, "L"), ...arms(1, "L") })), 5); // hemiplegia
  assert.equal(suggestP(pyramidal({ ...legs(2), wristExtensionL: 2 })), 5);  // marked tetraparesis
  assert.equal(suggestP(pyramidal({ ...legs(1), ...arms(1) })), 6);          // tetraplegia
});

const cerebellar = (o: Partial<CerebellarForm>): CerebellarForm => ({ ...DEFAULT_STATE.cerebellar, ...o });

test("Cerebellar FS", () => {
  assert.equal(suggestC(cerebellar({})), 0);
  assert.equal(suggestC(cerebellar({ limbAtaxiaRightArm: 1 })), 1);
  assert.equal(suggestC(cerebellar({ tandemWalking: 1 })), 1);
  assert.equal(suggestC(cerebellar({ tandemWalking: 2 })), 2);
  assert.equal(suggestC(cerebellar({ romberg: 2 })), 2);
  assert.equal(suggestC(cerebellar({ gaitAtaxia: 2 })), 2);
  assert.equal(suggestC(cerebellar({ limbAtaxiaLeftLeg: 2 })), 2);
  assert.equal(suggestC(cerebellar({ limbAtaxiaLeftLeg: 3 })), 3);
  assert.equal(suggestC(cerebellar({ truncalAtaxia: 3 })), 3);
  assert.equal(suggestC(cerebellar({ gaitAtaxia: 4 })), 3); // severe gait ataxia alone
  assert.equal(suggestC(cerebellar({ limbAtaxiaRightArm: 4, limbAtaxiaLeftArm: 4, limbAtaxiaRightLeg: 4, limbAtaxiaLeftLeg: 4 })), 3);
  assert.equal(suggestC(cerebellar({ gaitAtaxia: 4, limbAtaxiaRightArm: 4, limbAtaxiaLeftArm: 4, limbAtaxiaRightLeg: 4 })), 4);
  assert.equal(suggestC(cerebellar({ inabilityCoordinatedMovements: true })), 5);
});

const sensory = (o: Partial<SensoryForm>): SensoryForm => ({ ...DEFAULT_STATE.sensory, ...o });

test("Sensory FS", () => {
  assert.equal(suggestS(sensory({})), 0);
  assert.equal(suggestS(sensory({ vibSeverity: "mild", vibCount: 2 })), 1);
  assert.equal(suggestS(sensory({ ptSeverity: "signs", ptCount: 1 })), 1);
  assert.equal(suggestS(sensory({ vibSeverity: "mild", vibCount: 3 })), 2);
  assert.equal(suggestS(sensory({ ptSeverity: "signs", ptCount: 4 })), 2);
  assert.equal(suggestS(sensory({ vibSeverity: "moderate", vibCount: 1 })), 2);
  assert.equal(suggestS(sensory({ jpSeverity: "mild", jpCount: 1 })), 2);
  assert.equal(suggestS(sensory({ ptSeverity: "mild", ptCount: 2 })), 2);
  assert.equal(suggestS(sensory({ ptSeverity: "moderate", ptCount: 2 })), 3);
  assert.equal(suggestS(sensory({ jpSeverity: "moderate", jpCount: 2 })), 3);
  assert.equal(suggestS(sensory({ vibSeverity: "absent", vibCount: 2 })), 3);
  assert.equal(suggestS(sensory({ ptSeverity: "mild", ptCount: 3 })), 3);
  assert.equal(suggestS(sensory({ jpSeverity: "moderate", jpCount: 4 })), 3);
  assert.equal(suggestS(sensory({ ptSeverity: "marked", ptCount: 1 })), 4);
  assert.equal(suggestS(sensory({ ptSeverity: "moderate", ptCount: 3 })), 4);
  assert.equal(suggestS(sensory({ jpSeverity: "marked", jpCount: 4 })), 4);
  assert.equal(suggestS(sensory({ vibSeverity: "absent", vibCount: 4 })), 4);
  assert.equal(suggestS(sensory({ ptSeverity: "absent", ptCount: 1 })), 5);
  const everythingLost = { vibSeverity: "absent", vibCount: 4, ptSeverity: "absent", ptCount: 4, jpSeverity: "absent", jpCount: 4 } as const;
  assert.equal(suggestS(sensory(everythingLost)), 6);
  assert.equal(suggestS(sensory({ ...everythingLost, jpCount: 1 })), 5);
});

const bowelBladder = (o: Partial<BowelBladderForm>): BowelBladderForm => ({ ...DEFAULT_STATE.bb, ...o });

test("Bowel/bladder FS", () => {
  assert.equal(suggestBB(bowelBladder({})), 0);
  assert.equal(suggestBB(bowelBladder({ urinaryHesitancy: 1 })), 1);
  assert.equal(suggestBB(bowelBladder({ bowelDysfunction: 1 })), 1);
  assert.equal(suggestBB(bowelBladder({ urinaryUrgency: 2 })), 2);
  assert.equal(suggestBB(bowelBladder({ bowelDysfunction: 2 })), 2);
  assert.equal(suggestBB(bowelBladder({ urinaryUrgency: 3 })), 3);
  assert.equal(suggestBB(bowelBladder({ catheterisation: "intermittent" })), 3);
  assert.equal(suggestBB(bowelBladder({ bowelDysfunction: 3 })), 3);
  assert.equal(suggestBB(bowelBladder({ catheterisation: "almostConstant" })), 4);
  assert.equal(suggestBB(bowelBladder({ catheterisation: "indwelling" })), 5);
  assert.equal(suggestBB(bowelBladder({ urinaryUrgency: 4 })), 5);
  assert.equal(suggestBB(bowelBladder({ bowelDysfunction: 4 })), 5);
  assert.equal(suggestBB(bowelBladder({ urinaryHesitancy: 4, bowelDysfunction: 4 })), 6);
});

const mental = (o: Partial<MentalForm>): MentalForm => ({ ...DEFAULT_STATE.mental, ...o });

test("Cerebral FS", () => {
  assert.equal(suggestM(mental({})), 0);
  assert.equal(suggestM(mental({ signsOnlyCognition: true })), 1);
  assert.equal(suggestM(mental({ mildFatigue: true })), 1);
  assert.equal(suggestM(mental({ moderateToSevereFatigue: true })), 2);
  assert.equal(suggestM(mental({ lightlyReducedCognition: true })), 2);
  assert.equal(suggestM(mental({ moderatelyReducedCognition: true })), 3);
  assert.equal(suggestM(mental({ markedlyReducedCognition: true })), 4);
  assert.equal(suggestM(mental({ pronouncedDementia: true })), 5);
});

test("Saved v1 state is migrated", () => {
  const state = migrateState(1, {
    brainstem: { dysarthriaLevel: 2, dysphagiaLevel: 4 },
    cerebellar: { fingerNoseRightArm: true, gaitAtaxia: true, lineWalkDifficulty: true },
    bb: { frequentIncontinence: true, mildConstipation: true, permanentCatheter: true },
    assistance: "none",
    walkingDistance: "300",
  });
  assert.equal(state.brainstem.dysarthriaLevel, 3);
  assert.equal(state.brainstem.dysphagiaLevel, 5);
  assert.equal(state.cerebellar.limbAtaxiaRightArm, 2);
  assert.equal(state.cerebellar.gaitAtaxia, 3);
  assert.equal(state.cerebellar.tandemWalking, 1);
  assert.equal(state.bb.urinaryUrgency, 3);
  assert.equal(state.bb.bowelDysfunction, 1);
  assert.equal(state.bb.catheterisation, "indwelling");
  assert.equal(state.walkingDistance, "300");
  assert.equal(state.visual.scotoma, 0);
});
