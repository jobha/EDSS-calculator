import { useEffect, useMemo, useState } from "react";
import { Language, translations } from "./i18n/translations";
import type { AssistanceId } from "./types/edss";
import type { VisualForm, BrainstemForm, PyramidalForm, CerebellarForm, SensoryForm, BowelBladderForm, MentalForm } from "./types/forms";
import { assess, type FSKey } from "./utils/assessment";
import { DEFAULT_STATE, decodeState, encodeState, type FormState } from "./utils/state";
import { buildExaminationText, buildSummary, rationaleText } from "./utils/report";
import { validateEDSSInputs } from "./utils/validation";
import { FSRow } from "./components/FSRow";
import { ResultPanel, StickyResultBar } from "./components/ResultPanel";
import { CompareSection } from "./components/CompareSection";
import { StateTransfer } from "./components/StateTransfer";
import { ExplainModal } from "./components/ExplainModal";
import { VisualSection } from "./components/sections/VisualSection";
import { BrainstemSection } from "./components/sections/BrainstemSection";
import { PyramidalSection } from "./components/sections/PyramidalSection";
import { CerebellarSection } from "./components/sections/CerebellarSection";
import { SensorySection } from "./components/sections/SensorySection";
import { BowelBladderSection } from "./components/sections/BowelBladderSection";
import { CerebralSection } from "./components/sections/CerebralSection";
import { AmbulationSection } from "./components/sections/AmbulationSection";

const shallowEqual = (a: object, b: object) => {
  const ra = a as Record<string, unknown>, rb = b as Record<string, unknown>;
  return Object.keys(rb).every((k) => ra[k] === rb[k]);
};

function languageFromUrl(): Language {
  const param = new URLSearchParams(window.location.search);
  const value = (param.get("language") || param.get("lang") || "").toLowerCase();
  return value === "norwegian" || value === "no" || value === "nb" ? "no" : "en";
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return [copied, copy] as const;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(languageFromUrl);
  const t = translations[language];

  const [visual, setVisual] = useState<VisualForm>(DEFAULT_STATE.visual);
  const [brainstem, setBrainstem] = useState<BrainstemForm>(DEFAULT_STATE.brainstem);
  const [pyramidal, setPyramidal] = useState<PyramidalForm>(DEFAULT_STATE.pyramidal);
  const [cerebellar, setCerebellar] = useState<CerebellarForm>(DEFAULT_STATE.cerebellar);
  const [sensory, setSensory] = useState<SensoryForm>(DEFAULT_STATE.sensory);
  const [bb, setBB] = useState<BowelBladderForm>(DEFAULT_STATE.bb);
  const [mental, setMental] = useState<MentalForm>(DEFAULT_STATE.mental);
  const [assistance, setAssistance] = useState<AssistanceId>(DEFAULT_STATE.assistance);
  const [distance, setDistance] = useState<string>(DEFAULT_STATE.walkingDistance);
  const [ambulationRestricted, setAmbulationRestricted] = useState<boolean>(DEFAULT_STATE.ambulationRestricted);
  const [overrides, setOverrides] = useState<FormState["overrides"]>(DEFAULT_STATE.overrides);
  const [ambulationDocs, setAmbulationDocs] = useState({
    reportedDistance: DEFAULT_STATE.reportedDistance,
    reportedTime: DEFAULT_STATE.reportedTime,
    measuredDistance: DEFAULT_STATE.measuredDistance,
  });
  const [previousInput, setPreviousInput] = useState("");
  const [showExplainModal, setShowExplainModal] = useState(false);

  useEffect(() => { document.documentElement.lang = language === "no" ? "nb" : "en"; }, [language]);

  const formState: FormState = useMemo(
    () => ({ visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, walkingDistance: distance, ambulationRestricted, ...ambulationDocs, overrides }),
    [visual, brainstem, pyramidal, cerebellar, sensory, bb, mental, assistance, distance, ambulationRestricted, ambulationDocs, overrides]
  );
  const assessment = useMemo(() => assess(formState), [formState]);
  const previousAssessment = useMemo(() => {
    const state = previousInput.trim() ? decodeState(previousInput) : null;
    return state ? assess(state) : null;
  }, [previousInput]);
  const delta = previousAssessment ? assessment.result.edss - previousAssessment.result.edss : null;

  const summary = useMemo(() => buildSummary(formState, assessment, t, previousAssessment), [formState, assessment, t, previousAssessment]);
  const examinationText = useMemo(() => buildExaminationText(formState, assessment, t), [formState, assessment, t]);
  const stateString = useMemo(() => encodeState(formState), [formState]);
  const warnings = useMemo(() => validateEDSSInputs({
    fs: assessment.fs,
    ambulation: assessment.result.ambulation,
    distance: assistance === "none" ? assessment.distance : null,
    pyramidal, cerebellar, sensory, bb, mental, brainstem, visual,
    edss: assessment.result.edss,
  }, t), [assessment, assistance, pyramidal, cerebellar, sensory, bb, mental, brainstem, visual, t]);

  const [copied, copy] = useCopied();
  const [copiedExam, copyExam] = useCopied();
  const [copiedState, copyState] = useCopied();
  const copyActions = { copySummary: () => copy(summary), copyExamination: () => copyExam(examinationText), copied, copiedExam };

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
    setAmbulationDocs({ reportedDistance: state.reportedDistance, reportedTime: state.reportedTime, measuredDistance: state.measuredDistance });
  }

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    const url = new URL(window.location.href);
    url.searchParams.set("language", newLang === "no" ? "norwegian" : "english");
    window.history.pushState({}, "", url.toString());
  }

  const setOverride = (key: FSKey) => (value: number | null) => setOverrides((prev) => {
    const next = { ...prev };
    if (value === null) delete next[key]; else next[key] = value;
    return next;
  });

  const sections: Record<FSKey, [object, object, () => void]> = {
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
    help: t.fsHelp[code],
    value: assessment.fs[code],
    suggested: assessment.suggested[code],
    overridden: assessment.overridden[code],
    onOverride: setOverride(code),
    isNormal: shallowEqual(sections[code][0], sections[code][1]) && !assessment.overridden[code],
    onNormal: () => { sections[code][2](); setOverride(code)(null); },
    labels: { override: t.overrideScore, auto: t.fsAuto, manual: t.fsManual, reset: t.fsUseSuggested, allNormal: t.allNormal },
  });

  const resultPanel = (
    <ResultPanel
      assessment={assessment}
      delta={delta}
      rationale={rationaleText(assessment, t)}
      warnings={warnings}
      summary={summary}
      examinationText={examinationText}
      actions={copyActions}
      onExplain={() => setShowExplainModal(true)}
      t={t}
    />
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
              <button onClick={() => applyState(DEFAULT_STATE)} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-100 text-sm font-medium">{t.reset}</button>
            </div>
          </header>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6 lg:items-start">
            <main className="space-y-4 min-w-0">
              <StickyResultBar assessment={assessment} delta={delta} actions={copyActions} t={t} />

              <FSRow {...fsRowProps("V")}><VisualSection value={visual} onChange={setVisual} t={t} /></FSRow>
              <FSRow {...fsRowProps("BS")}><BrainstemSection value={brainstem} onChange={setBrainstem} t={t} /></FSRow>
              <FSRow {...fsRowProps("P")}><PyramidalSection value={pyramidal} onChange={setPyramidal} t={t} /></FSRow>
              <FSRow {...fsRowProps("C")}><CerebellarSection value={cerebellar} onChange={setCerebellar} t={t} /></FSRow>
              <FSRow {...fsRowProps("S")}><SensorySection value={sensory} onChange={setSensory} t={t} /></FSRow>
              <FSRow {...fsRowProps("BB")}><BowelBladderSection value={bb} onChange={setBB} t={t} /></FSRow>
              <FSRow {...fsRowProps("M")}><CerebralSection value={mental} onChange={setMental} t={t} /></FSRow>

              <AmbulationSection
                assistance={assistance}
                onAssistance={setAssistance}
                distance={distance}
                onDistance={setDistance}
                parsedDistance={assessment.distance}
                restricted={ambulationRestricted}
                onRestricted={setAmbulationRestricted}
                documentation={ambulationDocs}
                onDocumentation={(field, v) => setAmbulationDocs((prev) => ({ ...prev, [field]: v }))}
                ambulation={assessment.result.ambulation}
                t={t}
              />

              {/* Results (narrow screens) */}
              <div className="lg:hidden">{resultPanel}</div>

              <CompareSection input={previousInput} onInput={setPreviousInput} previous={previousAssessment} current={assessment} t={t} />
              <StateTransfer stateString={stateString} onCopy={() => copyState(stateString)} copied={copiedState} onRestore={applyState} t={t} />
            </main>

            {/* Results (wide screens) */}
            <aside className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-4">
              {resultPanel}
            </aside>
          </div>
        </div>
      </div>

      {showExplainModal && <ExplainModal assessment={assessment} onClose={() => setShowExplainModal(false)} t={t} />}
    </>
  );
}
