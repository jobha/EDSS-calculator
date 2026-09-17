import type { Translations } from "../i18n/translations";
import { FS_KEYS, type Assessment } from "../utils/assessment";
import { signed } from "../utils/report";
import { FS_LABELS } from "./FSRow";

export function CompareSection({ input, onInput, previous, current, t }: {
  input: string;
  onInput: (value: string) => void;
  previous: Assessment | null;
  current: Assessment;
  t: Translations;
}) {
  const rows = previous && [
    { label: "EDSS", prev: previous.result.edss, curr: current.result.edss, decimals: 1 },
    ...FS_KEYS.map((k) => ({ label: FS_LABELS[k], prev: previous.fs[k], curr: current.fs[k], decimals: 0 })),
    { label: t.ambulationScore, prev: previous.result.ambulation?.score ?? 0, curr: current.result.ambulation?.score ?? 0, decimals: 0 },
  ];

  return (
    <section className="p-4 rounded-xl bg-white border space-y-3">
      <h2 className="font-semibold">{t.compareTitle}</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInput(e.target.value)}
          placeholder={t.comparePaste}
          className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded"
        />
        {input && (
          <button onClick={() => onInput("")} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100">{t.compareClear}</button>
        )}
      </div>
      {input.trim() !== "" && !previous && <div className="text-xs text-red-600">{t.restoreError}</div>}
      {rows && (
        <>
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
                {rows.map((row) => (
                  <tr key={row.label} className="border-t">
                    <td className="py-1 pr-4">{row.label}</td>
                    <td className="py-1 pr-4 tabular-nums">{row.prev.toFixed(row.decimals)}</td>
                    <td className="py-1 pr-4 tabular-nums">{row.curr.toFixed(row.decimals)}</td>
                    <td className={`py-1 pr-4 tabular-nums ${row.curr !== row.prev ? "font-semibold" : "opacity-50"}`}>
                      {row.curr === row.prev ? "–" : row.decimals ? signed(row.curr - row.prev) : `${row.curr > row.prev ? "+" : "−"}${Math.abs(row.curr - row.prev)}`}
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
  );
}
