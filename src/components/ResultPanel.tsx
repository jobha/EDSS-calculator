import type { Translations } from "../i18n/translations";
import { FS_KEYS, type Assessment } from "../utils/assessment";
import { correctedFS } from "../utils/edss";
import type { ValidationWarning } from "../utils/validation";
import { signed } from "../utils/report";

export const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

// Buttons with each FS score (converted where it differs); jump to the section
export function FSChips({ assessment, t }: { assessment: Assessment; t: Translations }) {
  const { fs, suggested, overridden, result } = assessment;
  const converted = correctedFS(fs);
  return (
    <div className="flex flex-wrap gap-1.5">
      {FS_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => scrollToSection(`fs-${k}`)}
          className={`rounded-lg border px-2 py-1 text-xs font-mono hover:bg-gray-100 ${overridden[k] ? "border-amber-400 bg-amber-50" : fs[k] > 0 ? "border-blue-300 bg-blue-50" : "bg-white"}`}
          title={overridden[k] ? t.fsManual.replace("{suggested}", String(suggested[k])) : undefined}
        >
          {k} <span className="font-bold">{fs[k]}</span>
          {converted[k] !== fs[k] && <span className="opacity-60">→{converted[k]}</span>}
        </button>
      ))}
      <button type="button" onClick={() => scrollToSection("ambulation")} className={`rounded-lg border px-2 py-1 text-xs font-mono hover:bg-gray-100 ${result.ambulation ? "border-blue-300 bg-blue-50" : "bg-white"}`}>
        {t.ambulationShort} <span className="font-bold">{result.ambulation?.score ?? 0}</span>
      </button>
    </div>
  );
}

export function ChangeBadge({ delta, t }: { delta: number | null; t: Translations }) {
  if (delta === null) return null;
  return <span className="text-xs font-semibold rounded-lg px-2 py-0.5 bg-gray-100 text-gray-800" title={t.previousVisit}>{signed(delta)}</span>;
}

type CopyActions = { copySummary: () => void; copyExamination: () => void; copied: boolean; copiedExam: boolean };

// Compact bar pinned to the top on narrow screens
export function StickyResultBar({ assessment, delta, actions, t }: { assessment: Assessment; delta: number | null; actions: CopyActions; t: Translations }) {
  return (
    <div className="lg:hidden sticky top-2 z-40 rounded-xl border bg-white/95 backdrop-blur shadow-sm px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide opacity-60">EDSS</span>
        <span className="text-3xl font-black tabular-nums">{assessment.result.edss.toFixed(1)}</span>
        <ChangeBadge delta={delta} t={t} />
        <button onClick={actions.copySummary} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700">
          {actions.copied ? t.copied : t.copySummary}
        </button>
      </div>
      <FSChips assessment={assessment} t={t} />
    </div>
  );
}

export function ResultPanel({ assessment, delta, rationale, warnings, summary, examinationText, actions, onExplain, t }: {
  assessment: Assessment;
  delta: number | null;
  rationale: string;
  warnings: ValidationWarning[];
  summary: string;
  examinationText: string;
  actions: CopyActions;
  onExplain: () => void;
  t: Translations;
}) {
  const fs = Object.values(assessment.fs);
  const converted = Object.values(correctedFS(assessment.fs));
  const counts = (values: number[]) => [0, 1, 2, 3, 4, 5, 6].map((g) => `${values.filter((v) => v === g).length}×${g}`).join(", ");

  return (
    <div className="space-y-3">
      <section className="p-4 rounded-2xl bg-white shadow-sm border space-y-3">
        <div className="flex items-baseline gap-3">
          <div className="text-5xl font-black tabular-nums">{assessment.result.edss.toFixed(1)}</div>
          <div className="text-sm uppercase tracking-wide opacity-60">EDSS</div>
          <ChangeBadge delta={delta} t={t} />
        </div>
        <div className="text-sm opacity-80">{rationale}</div>
        <FSChips assessment={assessment} t={t} />
        <div className="flex flex-wrap gap-2">
          <button onClick={actions.copySummary} className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-700">{actions.copied ? t.copied : t.copySummary}</button>
          <button onClick={actions.copyExamination} className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-100">{actions.copiedExam ? t.copied : t.copyExamText}</button>
          <button onClick={onExplain} className="px-3 py-2 rounded-xl border text-sm hover:bg-blue-50 hover:border-blue-300">{t.explainEDSS}</button>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="p-3 rounded-xl border border-amber-300 bg-amber-50">
          <div className="text-xs font-semibold mb-2 text-amber-900">{t.warnings}</div>
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div key={idx} className={`text-xs p-2 rounded-lg ${warning.type === "warning" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"}`}>
                <span className="font-semibold">{warning.type === "warning" ? "⚠️" : "ℹ️"}</span> {warning.message}
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
        <div>{t.rawFS}: {counts(fs)}</div>
        <div>{t.correctedFS}: {counts(converted)}</div>
      </div>
    </div>
  );
}
