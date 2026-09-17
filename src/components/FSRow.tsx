import React from "react";

interface FSRowProps {
  code: string;
  meta: { label: string; max: number; help: string };
  // Score used for the EDSS
  value: number;
  // Score suggested from the examination findings
  suggested: number;
  overridden: boolean;
  onOverride: (value: number | null) => void;
  // true when every finding in the section is at its default and no override is set
  isNormal: boolean;
  onNormal: () => void;
  labels: { override: string; auto: string; manual: string; reset: string; allNormal: string };
  children: React.ReactNode;
}

const badgeClass = (value: number) =>
  value === 0 ? "bg-gray-100 text-gray-500"
    : value === 1 ? "bg-blue-100 text-blue-900"
    : value === 2 ? "bg-yellow-100 text-yellow-900"
    : value === 3 ? "bg-orange-100 text-orange-900"
    : "bg-red-100 text-red-900";

export function FSRow({ code, meta, value, suggested, overridden, onOverride, isNormal, onNormal, labels, children }: FSRowProps) {
  return (
    <section id={`fs-${code}`} className={`space-y-3 p-3 md:p-4 rounded-xl border bg-white scroll-mt-36 lg:scroll-mt-4 ${overridden ? "border-amber-400" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center min-w-9 h-9 rounded-lg text-lg font-bold tabular-nums ${badgeClass(value)}`} aria-label={`FS ${value}`}>
            {value}
          </span>
          <div>
            <h2 className="font-semibold">{meta.label}</h2>
            <div className="text-xs opacity-60">{meta.help}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNormal && (
            <button type="button" onClick={onNormal} className="text-xs px-2 py-1 rounded-lg border bg-white hover:bg-gray-100">
              {labels.allNormal}
            </button>
          )}
          {overridden && (
            <>
              <span className="text-xs text-amber-800 bg-amber-100 rounded-lg px-2 py-1">{labels.manual.replace("{suggested}", String(suggested))}</span>
              <button type="button" className="text-xs underline text-amber-900" onClick={() => onOverride(null)}>{labels.reset}</button>
            </>
          )}
          <label className="text-xs opacity-70" htmlFor={`fs-${code}-score`}>{labels.override}</label>
          <select
            id={`fs-${code}-score`}
            className={`rounded-xl border p-1 text-sm ${overridden ? "border-amber-400 bg-amber-50 font-semibold" : ""}`}
            value={overridden ? String(value) : "auto"}
            onChange={(e) => onOverride(e.target.value === "auto" ? null : Number(e.target.value))}
          >
            <option value="auto">{labels.auto.replace("{suggested}", String(suggested))}</option>
            {Array.from({ length: meta.max + 1 }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}
