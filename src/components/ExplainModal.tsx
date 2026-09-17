import type { Translations } from "../i18n/translations";
import { FS_KEYS, type Assessment } from "../utils/assessment";
import { correctedFS, FS_STEP_ROWS, type FSColumn } from "../utils/edss";
import { describeAmbulation } from "../utils/report";

const FS_COLUMNS: FSColumn[] = ["0", "1", "2", "3", "4", "5"];

export function ExplainModal({ assessment, onClose, t }: { assessment: Assessment; onClose: () => void; t: Translations }) {
  const { fs, overridden, result } = assessment;
  const converted = correctedFS(fs);
  const edss = result.edss;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{t.edssCalculationExplanation}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none" aria-label={t.close}>&times;</button>
        </div>

        <div className="space-y-4">
          {/* Step 1: Raw FS Scores */}
          <div className="p-4 rounded-xl bg-gray-50 border">
            <div className="font-semibold text-sm mb-2">{t.step} 1: {t.rawFSScores}</div>
            <div className="text-sm">
              {FS_KEYS.map((k) => `${k}=${fs[k]}${overridden[k] ? "*" : ""}`).join(", ")}
              {FS_KEYS.some((k) => overridden[k]) && <div className="text-xs text-amber-800 mt-1">* {t.fsManualNote}</div>}
            </div>
          </div>

          {/* Step 2: Converted FS Scores */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="font-semibold text-sm mb-2">{t.step} 2: {t.correctedFSScores}</div>
            <div className="text-sm space-y-1">
              {fs.V !== converted.V && <div>• {t.visual}: {fs.V} → {converted.V} ({t.correctedPerEDSSRules})</div>}
              {fs.BB !== converted.BB && <div>• {t.bowelBladder}: {fs.BB} → {converted.BB} ({t.correctedPerEDSSRules})</div>}
              {fs.V === converted.V && fs.BB === converted.BB && <div className="text-gray-600">{t.noCorrectionsNeeded}</div>}
              <div className="mt-2 font-mono text-xs">{FS_KEYS.map((k) => `${k}=${converted[k]}`).join(", ")}</div>
            </div>
          </div>

          {/* Step 3: FS-Based Step */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="font-semibold text-sm mb-2">{t.step} 3: {t.fsBasedScore}</div>
            <div className="font-mono text-lg font-bold mb-3">{result.fsStep.edss.toFixed(1)}</div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="font-semibold text-xs mb-2">{t.fsPatternsTableTitle}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-100">
                      {FS_COLUMNS.map((c) => (
                        <th key={c} className="border border-purple-300 px-2 py-1 text-center font-semibold">FS {c === "5" ? "5/6" : c}</th>
                      ))}
                      <th className="border border-purple-300 px-2 py-1 text-center font-semibold">EDSS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {FS_STEP_ROWS.map((row, i) => (
                      <tr key={i} className={result.fsStep.row === i ? "bg-yellow-100 font-bold" : ""}>
                        {FS_COLUMNS.map((c) => (
                          <td key={c} className="border border-purple-200 px-2 py-1 text-center">{row.cells[c] ? `${row.cells[c]}×` : ""}</td>
                        ))}
                        <td className="border border-purple-200 px-2 py-1 text-center font-mono">{row.edss.toFixed(1)}{row.inTable ? "" : "*"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-600 mt-2">{t.blankCellsNote}</div>
              <div className="text-xs text-gray-600 mt-1">{t.notInTableNote}</div>
            </div>
          </div>

          {/* Step 4: Ambulation */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="font-semibold text-sm mb-2">{t.step} 4: {t.ambulationBasedScore}</div>
            <div className="text-sm">
              {result.ambulation ? (
                <>
                  <div className="font-mono text-lg font-bold">{(result.ambulation.exclusive ? t.ambulationDefines : t.ambulationAtLeast).replace("{edss}", result.ambulation.minEDSS.toFixed(1))}</div>
                  <div className="text-xs mt-1 text-gray-700">{describeAmbulation(result.ambulation, t)}</div>
                </>
              ) : (
                <div className="text-xs text-gray-700">{t.ambulationNoLimit}</div>
              )}
            </div>
          </div>

          {/* Step 5: Final Score Selection */}
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="font-semibold text-sm mb-2">{t.step} 5: {t.finalScoreSelection}</div>
            <div className="bg-white p-3 rounded border text-xs space-y-1">
              {result.ambulation?.exclusive ? (
                <div>{t.finalRuleExclusive}: <span className="font-bold text-base">{edss.toFixed(1)}</span></div>
              ) : (
                <>
                  <div className="font-mono">{t.finalRuleMax}</div>
                  <div>max({result.fsStep.edss.toFixed(1)}, {(result.ambulation?.minEDSS ?? 0).toFixed(1)}) = <span className="font-bold text-base">{edss.toFixed(1)}</span></div>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-100 border-2 border-indigo-400">
            <div className="font-bold text-lg">{t.finalEDSS}: {edss.toFixed(1)}</div>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full px-4 py-3 rounded-xl border bg-gray-100 hover:bg-gray-200 font-semibold">
          {t.close}
        </button>
      </div>
    </div>
  );
}
