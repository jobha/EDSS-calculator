import { useState } from "react";
import type { Translations } from "../i18n/translations";
import { decodeState, type FormState } from "../utils/state";

export function StateTransfer({ stateString, onCopy, copied, onRestore, t }: {
  stateString: string;
  onCopy: () => void;
  copied: boolean;
  onRestore: (state: FormState) => void;
  t: Translations;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const restore = () => {
    const state = decodeState(input);
    if (!state) {
      setError(t.restoreError);
      return;
    }
    setError("");
    onRestore(state);
    setInput("");
  };

  return (
    <section className="p-4 rounded-xl bg-gray-100 space-y-3">
      <div className="space-y-2">
        <div className="text-xs text-gray-500">{t.formStateString}</div>
        <div className="flex gap-2">
          <textarea
            readOnly
            value={stateString}
            className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded resize-none"
            rows={1}
            style={{ minHeight: "32px" }}
          />
          <button onClick={onCopy} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">
            {copied ? t.copied : t.copyButton}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-gray-500">{t.restoreFromString}</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.pasteHere}
            className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded"
          />
          <button onClick={restore} className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">
            {t.restoreButton}
          </button>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    </section>
  );
}
