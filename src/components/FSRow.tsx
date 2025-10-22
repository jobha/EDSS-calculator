import React from "react";
import { clamp } from "../utils/helpers";

interface FSRowProps {
  code: string;
  meta: { label: string; max: number; help: string };
  fs: Record<string, number>;
  setFs: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  overrideLabel: string;
  children: React.ReactNode;
}

export function FSRow({ code, meta, fs, setFs, overrideLabel, children }: FSRowProps) {
  return (
    <div className="space-y-2 p-3 rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{meta.label}</div>
          <div className="text-xs opacity-60">{meta.help}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs opacity-70">{overrideLabel}</label>
          <select
            className="rounded-xl border p-1 text-sm"
            value={fs[code]}
            onChange={(e) =>
              setFs((prev) => ({ ...prev, [code]: clamp(Number(e.target.value), 0, meta.max) }))
            }
          >
            {Array.from({ length: meta.max + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
