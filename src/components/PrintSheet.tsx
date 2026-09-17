// ============================================================================
// PRINTED SCORING SHEET
// Filled-in A4 sheet following the order of the scoring sheet. Only visible when printing.
// Personal information is left blank for handwriting; the app never stores it.
// ============================================================================

import type { ReactNode } from "react";
import type { Translations } from "../i18n/translations";
import { ARM_MUSCLES, LEG_MUSCLES, REFLEXES, type PyramidalForm } from "../types/forms";
import type { Assessment, FSKey } from "../utils/assessment";
import { convertBBForEDSS, convertVisualForEDSS } from "../utils/edss";
import { formatEyeAcuity } from "../utils/formatting";
import { PROPRIOCEPTIVE_LEVEL, SUPERFICIAL_LEVEL } from "../utils/scoring";
import type { FormState } from "../utils/state";
import { FS_LABELS } from "./FSRow";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Box({ children, wide = false, strong = false }: { children?: ReactNode; wide?: boolean; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center border border-gray-500 h-5 px-1 text-[9pt] tabular-nums ${wide ? "min-w-16" : "min-w-7"} ${strong ? "border-2 border-black font-bold" : ""}`}>
      {children}
    </span>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dotted border-gray-400 py-[1px]">
      <span className="text-[8.5pt] leading-tight">{label}</span>
      <span className="flex gap-1 shrink-0">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-[9.5pt] font-bold uppercase tracking-wide mt-2 mb-0.5">{title}</h2>
      <div className="grid grid-cols-2 gap-x-6 bg-gray-50 px-2 py-1">{children}</div>
    </section>
  );
}

const Column = ({ children }: { children: ReactNode }) => <div>{children}</div>;

// Pair of right/left boxes
const RL = ({ r, l }: { r: ReactNode; l: ReactNode }) => <><Box>{r}</Box><Box>{l}</Box></>;

export function PrintSheet({ state, assessment, t }: { state: FormState; assessment: Assessment; t: Translations }) {
  const { fs, suggested, overridden, result } = assessment;
  const { visual, brainstem: bs, pyramidal: p, cerebellar: c, sensory: s, bb, mental: m } = state;
  const today = new Date().toLocaleDateString(t.title === "EDSS-Kalkulator" ? "nb-NO" : "en-GB");

  const fsBox = (key: FSKey) => (
    <Box strong>{fs[key]}{overridden[key] ? ` M(${suggested[key]})` : ""}</Box>
  );
  const fsRow = (key: FSKey, converted?: number) => (
    <Row label={<b>{t.printFsScore}</b>}>
      {fsBox(key)}
      {converted !== undefined && <>→<Box strong>{converted}¹</Box></>}
    </Row>
  );

  const reflex = (name: string, side: "R" | "L") => p[`reflex${capitalize(name)}${side}` as keyof PyramidalForm] as number;
  const asymmetry = (r: number, l: number) => (r > l ? ">" : r < l ? "<" : "");
  const sensoryLimb = (prefix: "pt" | "vib" | "jp", limb: string, levels: Record<string, number>) => {
    const record = s as unknown as Record<string, unknown>;
    return record[`${prefix}${limb}`] ? levels[record[`${prefix}Severity`] as string] : 0;
  };
  const cognitionLevel = ["signsOnlyCognition", "lightlyReducedCognition", "moderatelyReducedCognition", "markedlyReducedCognition", "pronouncedDementia"]
    .findIndex((k) => m[k as keyof typeof m]) + 1;
  const fatigue = m.moderateToSevereFatigue ? "2–3" : m.mildFatigue ? "1" : "0";
  const catheterisation = { none: 0, intermittent: 1, almostConstant: 2, indwelling: 2 }[bb.catheterisation];
  const assistanceScale = state.assistance === "none" ? 0
    : state.assistance.startsWith("uni") ? 1
    : state.assistance.startsWith("bi") ? 2 : 3;
  const vConverted = convertVisualForEDSS(fs.V);
  const bbConverted = convertBBForEDSS(fs.BB);
  const fieldGrade = { none: 0, mild: 1, moderate: 2, marked: 3 }[visual.visualFieldDeficit];
  const nystagmus = { none: 0, mild: 1, clear: 2, spontaneous: 3 }[bs.nystagmus];

  return (
    <div className="hidden print:block text-black bg-white text-[9pt] leading-snug">
      {/* Page 1 */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[13pt] font-bold">{t.printTitle}</h1>
          <div className="text-[8pt] text-gray-700">{t.printSubtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-[8pt]">{t.printEdssStep}</div>
          <div className="border-2 border-black px-3 text-[16pt] font-black tabular-nums">{result.edss.toFixed(1)}</div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-6 mt-2">
        <div>
          {(["study", "patient", "birthDate", "centre", "rater", "examDate"] as const).map((k) => (
            <div key={k} className="flex items-end gap-2 border-b border-gray-500 h-5">
              <span className="text-[8.5pt] w-32 shrink-0">{t.printPersonal[k]}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[9pt] font-bold">{t.printSynopsis}</div>
          {(["V", "BS", "P", "C", "S", "BB", "M"] as const).map((k, i) => (
            <Row key={k} label={`${i + 1}. ${FS_LABELS[k]}`}>
              {fsBox(k)}
              {k === "V" && <>→<Box strong>{vConverted}¹</Box></>}
              {k === "BB" && <>→<Box strong>{bbConverted}¹</Box></>}
            </Row>
          ))}
          <Row label={t.ambulationScore}><Box strong>{result.ambulation?.score ?? 0}</Box></Row>
          <div className="flex items-end gap-2 border-b border-gray-500 h-6 mt-1">
            <span className="text-[8.5pt] w-32 shrink-0">{t.printPersonal.signature}</span>
          </div>
        </div>
      </div>

      <Section title={`1. ${FS_LABELS.V}`}>
        <Column>
          <Row label={t.visualAcuity}><span className="text-[7pt] self-center">OD/OS</span><Box wide>{formatEyeAcuity(visual.rightEyeAcuity)}</Box><Box wide>{formatEyeAcuity(visual.leftEyeAcuity)}</Box></Row>
          <Row label={t.visualFieldDeficit}><Box>{fieldGrade}</Box></Row>
        </Column>
        <Column>
          <Row label={t.scotoma}><Box>{visual.scotoma}</Box></Row>
          <Row label={`* ${t.discPallor}`}><Box>{visual.discPallor ? 1 : 0}</Box></Row>
          {fsRow("V", vConverted)}
        </Column>
      </Section>

      <Section title={`2. ${FS_LABELS.BS}`}>
        <Column>
          <Row label={t.eyeMotility}><Box>{bs.eyeMotilityLevel}</Box></Row>
          <Row label={t.nystagmus}><Box>{nystagmus}</Box></Row>
          <Row label={`${t.facialSensibility} (${t.rightAbbrev}/${t.leftAbbrev})`}><RL r={bs.facialSensRight} l={bs.facialSensLeft} /></Row>
          <Row label={`${t.facialSymmetry} (${t.rightAbbrev}/${t.leftAbbrev})`}><RL r={bs.facialSymRight} l={bs.facialSymLeft} /></Row>
        </Column>
        <Column>
          <Row label={`${t.hearing} (${t.rightAbbrev}/${t.leftAbbrev})`}><RL r={bs.hearingRight} l={bs.hearingLeft} /></Row>
          <Row label={t.dysarthria}><Box>{bs.dysarthriaLevel}</Box></Row>
          <Row label={t.dysphagia}><Box>{bs.dysphagiaLevel}</Box></Row>
          <Row label={t.otherCranialNerves}><Box>{bs.otherCranialNerves}</Box></Row>
          {fsRow("BS")}
        </Column>
      </Section>

      <Section title={`3. ${FS_LABELS.P}`}>
        <Column>
          <Row label={<b>{t.reflexes}</b>}><span className="text-[7pt] w-7 text-center">{t.rightAbbrev}</span><span className="text-[7pt] w-7 text-center">&gt;&lt;</span><span className="text-[7pt] w-7 text-center">{t.leftAbbrev}</span></Row>
          {REFLEXES.map((r) => (
            <Row key={r} label={t.reflexNames[r]}><Box>{reflex(r, "R")}</Box><Box>{asymmetry(reflex(r, "R"), reflex(r, "L"))}</Box><Box>{reflex(r, "L")}</Box></Row>
          ))}
          <Row label={t.plantarResponse}><Box>{p.plantarR}</Box><Box>{asymmetry(p.plantarR, p.plantarL)}</Box><Box>{p.plantarL}</Box></Row>
          <Row label={t.cutaneousReflexes}><Box>{p.cutaneousR}</Box><Box>{asymmetry(p.cutaneousR, p.cutaneousL)}</Box><Box>{p.cutaneousL}</Box></Row>
          <Row label={`* ${t.palmomental}`}><Box>{p.palmomentalR}</Box><Box>{asymmetry(p.palmomentalR, p.palmomentalL)}</Box><Box>{p.palmomentalL}</Box></Row>
          <Row label={<b>{t.printStrength}</b>}><span className="text-[7pt] w-7 text-center">{t.rightAbbrev}</span><span className="text-[7pt] w-7 text-center">{t.leftAbbrev}</span></Row>
          {[...ARM_MUSCLES, ...LEG_MUSCLES].map((muscle) => (
            <Row key={muscle} label={t.muscles[muscle]}><RL r={p[`${muscle}R`]} l={p[`${muscle}L`]} /></Row>
          ))}
        </Column>
        <Column>
          <Row label={`* ${t.pronation}`}><RL r={p.pronationR} l={p.pronationL} /></Row>
          <Row label={`* ${t.downwardDrift}`}><RL r={p.downwardDriftR} l={p.downwardDriftL} /></Row>
          <Row label={`* ${t.legSinking}`}><RL r={p.legSinkingR} l={p.legSinkingL} /></Row>
          <Row label={`* ${t.legLiftDegrees}`}><Box>{p.legLiftDegreesR && `${p.legLiftDegreesR}°`}</Box><Box>{p.legLiftDegreesL && `${p.legLiftDegreesL}°`}</Box></Row>
          <Row label={`* ${t.heelWalking}`}><RL r={p.heelWalkingR} l={p.heelWalkingL} /></Row>
          <Row label={`* ${t.toeWalking}`}><RL r={p.toeWalkingR} l={p.toeWalkingL} /></Row>
          <Row label={`* ${t.hopping}`}><RL r={p.hoppingR} l={p.hoppingL} /></Row>
          <Row label={<b>{t.spasticity}</b>}><span /></Row>
          <Row label={t.spasticityArms}><RL r={p.spasticityArmsR} l={p.spasticityArmsL} /></Row>
          <Row label={t.spasticityLegs}><RL r={p.spasticityLegsR} l={p.spasticityLegsL} /></Row>
          <Row label={t.gaitSpasticity}><Box>{p.gaitSpasticity}</Box></Row>
          <Row label={t.overallMotorPerformance}><Box>{p.overallMotorPerformance}</Box></Row>
          {fsRow("P")}
        </Column>
      </Section>

      {/* Page 2 */}
      <div className="break-before-page" />

      <Section title={`4. ${FS_LABELS.C}`}>
        <Column>
          <Row label={t.headTremor}><Box>{c.headTremor}</Box></Row>
          <Row label={t.truncalAtaxia}><Box>{c.truncalAtaxia}</Box></Row>
          <Row label={`${t.limbAtaxia} ${t.printUE} (${t.rightAbbrev}/${t.leftAbbrev})`}><RL r={c.limbAtaxiaRightArm} l={c.limbAtaxiaLeftArm} /></Row>
          <Row label={`${t.limbAtaxia} ${t.printLE} (${t.rightAbbrev}/${t.leftAbbrev})`}><RL r={c.limbAtaxiaRightLeg} l={c.limbAtaxiaLeftLeg} /></Row>
        </Column>
        <Column>
          <Row label={t.tandemWalking}><Box>{c.tandemWalking}</Box></Row>
          <Row label={t.gaitAtaxia}><Box>{c.gaitAtaxia}</Box></Row>
          <Row label={t.romberg}><Box>{c.romberg}</Box></Row>
          <Row label={t.otherCerebellar}><Box>{c.otherCerebellar}</Box></Row>
          <Row label={t.unableCoordMovements}><Box>{c.inabilityCoordinatedMovements ? "✓" : ""}</Box></Row>
          {fsRow("C")}
        </Column>
      </Section>

      <Section title={`5. ${FS_LABELS.S}`}>
        <Column>
          <Row label={`${t.painTouch} ${t.printUE}`}><RL r={sensoryLimb("pt", "RightArm", SUPERFICIAL_LEVEL)} l={sensoryLimb("pt", "LeftArm", SUPERFICIAL_LEVEL)} /></Row>
          <Row label={`${t.painTouch} ${t.printTrunk}`}><RL r="" l="" /></Row>
          <Row label={`${t.painTouch} ${t.printLE}`}><RL r={sensoryLimb("pt", "RightLeg", SUPERFICIAL_LEVEL)} l={sensoryLimb("pt", "LeftLeg", SUPERFICIAL_LEVEL)} /></Row>
          <Row label={`${t.vibration} ${t.printUE}`}><RL r={sensoryLimb("vib", "RightArm", PROPRIOCEPTIVE_LEVEL)} l={sensoryLimb("vib", "LeftArm", PROPRIOCEPTIVE_LEVEL)} /></Row>
          <Row label={`${t.vibration} ${t.printLE}`}><RL r={sensoryLimb("vib", "RightLeg", PROPRIOCEPTIVE_LEVEL)} l={sensoryLimb("vib", "LeftLeg", PROPRIOCEPTIVE_LEVEL)} /></Row>
        </Column>
        <Column>
          <Row label={`${t.jointPosition} ${t.printUE}`}><RL r={sensoryLimb("jp", "RightArm", PROPRIOCEPTIVE_LEVEL)} l={sensoryLimb("jp", "LeftArm", PROPRIOCEPTIVE_LEVEL)} /></Row>
          <Row label={`${t.jointPosition} ${t.printLE}`}><RL r={sensoryLimb("jp", "RightLeg", PROPRIOCEPTIVE_LEVEL)} l={sensoryLimb("jp", "LeftLeg", PROPRIOCEPTIVE_LEVEL)} /></Row>
          <Row label={`* ${t.lhermitte}`}><Box>{s.lhermitte ? 1 : 0}</Box></Row>
          <Row label={`* ${t.paraesthesiae} ${t.printUE}`}><RL r={s.paraesthesiaeArmR ? 1 : 0} l={s.paraesthesiaeArmL ? 1 : 0} /></Row>
          <Row label={`* ${t.paraesthesiae} ${t.printTrunk}`}><RL r={s.paraesthesiaeTrunkR ? 1 : 0} l={s.paraesthesiaeTrunkL ? 1 : 0} /></Row>
          <Row label={`* ${t.paraesthesiae} ${t.printLE}`}><RL r={s.paraesthesiaeLegR ? 1 : 0} l={s.paraesthesiaeLegL ? 1 : 0} /></Row>
          {fsRow("S")}
        </Column>
      </Section>

      <Section title={`6. ${FS_LABELS.BB}`}>
        <Column>
          <Row label={t.urinaryHesitancy}><Box>{bb.urinaryHesitancy}</Box></Row>
          <Row label={t.urinaryUrgency}><Box>{bb.urinaryUrgency}</Box></Row>
          <Row label={t.catheterisation}><Box>{catheterisation}</Box></Row>
        </Column>
        <Column>
          <Row label={t.bowelDysfunction}><Box>{bb.bowelDysfunction}</Box></Row>
          <Row label={`* ${t.sexualDysfunction}`}><Box>{bb.sexualDysfunction}</Box></Row>
          {fsRow("BB", bbConverted)}
        </Column>
      </Section>

      <Section title={`7. ${FS_LABELS.M}`}>
        <Column>
          <Row label={`° ${t.depression}`}><Box>{m.depression ? 1 : 0}</Box></Row>
          <Row label={`° ${t.euphoria}`}><Box>{m.euphoria ? 1 : 0}</Box></Row>
        </Column>
        <Column>
          <Row label={t.cognitiveFunction}><Box>{cognitionLevel}</Box></Row>
          <Row label={t.fatigue}><Box>{fatigue}</Box></Row>
          {fsRow("M")}
        </Column>
      </Section>

      <Section title={t.ambulation}>
        <Column>
          <Row label={t.reportedDistance}><Box wide>{state.reportedDistance}</Box></Row>
          <Row label={t.reportedTime}><Box wide>{state.reportedTime}</Box></Row>
          <Row label={t.maxWalkDist}><Box wide>{state.assistance === "none" ? state.walkingDistance : ""}</Box></Row>
        </Column>
        <Column>
          <Row label={t.printAssistance}><Box>{assistanceScale}</Box></Row>
          <Row label={t.measuredDistance}><Box wide>{state.measuredDistance}</Box></Row>
          <Row label={<b>{t.ambulationScore}</b>}><Box strong>{result.ambulation?.score ?? 0}</Box></Row>
        </Column>
      </Section>

      <footer className="mt-3 text-[7.5pt] text-gray-700 space-y-0.5">
        <div>{t.printFootnotes}</div>
        <div>° {t.cerebralNote}</div>
        <div>{t.printGenerated.replace("{date}", today)}</div>
      </footer>
    </div>
  );
}
