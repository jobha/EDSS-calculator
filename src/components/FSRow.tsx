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
  labels: { override: string; auto: string; manual: string; reset: string };
  children: React.ReactNode;
}

export function FSRow({ code, meta, value, suggested, overridden, onOverride, labels, children }: FSRowProps) {
  return (
    <div id={`fs-${code}`} className={`space-y-2 p-3 rounded-xl border bg-white scroll-mt-28 ${overridden ? "border-amber-400" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{meta.label}</div>
          <div className="text-xs opacity-60">{meta.help}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
