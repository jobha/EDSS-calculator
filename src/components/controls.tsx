// ============================================================================
// FORM CONTROLS
// Abnormal (non-default) values are highlighted so findings stand out at a glance.
// ============================================================================

export type ChoiceOption<T> = { value: T; short: string; description?: string };

// "2 - Mild: ..." → { short: "2", description: "Mild: ..." }
export function splitLevel(label: string, fallbackShort: string): { short: string; description: string } {
  const match = label.match(/^(\d+)\s*-\s*(.*)$/s);
  return match ? { short: match[1], description: match[2] } : { short: fallbackShort, description: label };
}

export function levelOptions(labels: readonly string[]): ChoiceOption<number>[] {
  return labels.map((label, i) => ({ value: i, ...splitLevel(label, String(i)) }));
}

export const highlight = (active: boolean) =>
  `rounded-lg p-1.5 -m-1.5 ring-1 ${active ? "bg-blue-50 ring-blue-200" : "ring-transparent"}`;

const buttonClass = (active: boolean, abnormal: boolean, compact: boolean) => [
  "rounded-md border tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600",
  compact ? "h-7 min-w-6 px-1 text-xs" : "h-8 min-w-8 px-2 text-sm",
  active
    ? abnormal ? "bg-blue-600 border-blue-600 text-white font-semibold" : "bg-gray-200 border-gray-400 font-semibold"
    : "bg-white border-gray-300 hover:bg-gray-100",
].join(" ");

export function Choice<T extends string | number>({ label, value, options, onChange, normal, compact = false, showDescription = true }: {
  label?: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  // Value treated as normal (default: first option)
  normal?: T;
  compact?: boolean;
  showDescription?: boolean;
}) {
  const normalValue = normal ?? options[0].value;
  const abnormal = value !== normalValue;
  const selected = options.find((o) => o.value === value);
  const buttons = (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap ${compact ? "gap-0.5" : "gap-1"}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.description}
            onClick={() => onChange(o.value)}
            className={buttonClass(active, o.value !== normalValue, compact)}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
  if (!label && !showDescription) return buttons;
  return (
    <div className={`space-y-1 ${highlight(abnormal)}`}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {buttons}
      {showDescription && abnormal && selected?.description && (
        <div className="text-xs text-blue-950">{selected.description}</div>
      )}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-start gap-2 text-sm cursor-pointer ${highlight(checked)} ${checked ? "font-medium text-blue-950" : ""}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// Row of on/off buttons, e.g. sides (R, L) or limbs (RA, LA, RL, LL)
export function Toggles<K extends string>({ label, items, onToggle, disabled = false }: {
  label?: string;
  items: { key: K; short: string; checked: boolean }[];
  onToggle: (key: K, checked: boolean) => void;
  disabled?: boolean;
}) {
  const any = items.some((i) => i.checked);
  return (
    <div className={`flex flex-wrap items-center gap-2 ${highlight(any)}`}>
      {label && <span className={`text-sm min-w-24 ${any ? "font-medium text-blue-950" : ""}`}>{label}</span>}
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.checked}
            disabled={disabled}
            onClick={() => onToggle(item.key, !item.checked)}
            className={`${buttonClass(item.checked, true, false)} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {item.short}
          </button>
        ))}
      </div>
    </div>
  );
}
