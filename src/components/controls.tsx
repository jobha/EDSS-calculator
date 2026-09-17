// ============================================================================
// FORM CONTROLS
// Abnormal (non-default) values are highlighted so findings stand out at a glance.
// ============================================================================

import { Fragment, type ReactNode } from "react";

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
    <div role="radiogroup" aria-label={label} className={`flex ${compact ? "flex-nowrap gap-0.5" : "flex-wrap gap-1"}`}>
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

// Several graded selections under one label, e.g. right/left side or the four limbs
export function MultiChoice({ label, entries, labels }: {
  label: string;
  entries: readonly (readonly [string, number, (value: number) => void])[];
  labels: readonly string[];
}) {
  const options = levelOptions(labels);
  const abnormal = entries.filter(([, value]) => value > 0);
  return (
    <div className={`space-y-1 ${highlight(abnormal.length > 0)}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([side, value, onChange]) => (
          <div key={side} className="flex items-center gap-2">
            <span className="text-xs font-semibold w-9 shrink-0">{side}</span>
            <Choice value={value} options={options} onChange={onChange} showDescription={false} />
          </div>
        ))}
      </div>
      {abnormal.map(([side, value]) => (
        <div key={side} className="text-xs text-blue-950"><span className="font-semibold">{side}:</span> {options[value].description}</div>
      ))}
    </div>
  );
}

export type SidedRow = {
  key: string;
  label: string;
  right: number;
  left: number;
  normal: number;
  levels: readonly string[];
  onRight: (value: number) => void;
  onLeft: (value: number) => void;
};

// Right/left graded items in a grid, e.g. reflexes; definitions of abnormal levels listed below
export function SidedGrid({ title, rows, rightLabel, leftLabel }: { title?: string; rows: SidedRow[]; rightLabel: string; leftLabel: string }) {
  const abnormal = rows.flatMap((row) => [
    row.right !== row.normal && { key: `${row.key}R`, text: `${row.label} ${rightLabel}: ${levelOptions(row.levels)[row.right].description}` },
    row.left !== row.normal && { key: `${row.key}L`, text: `${row.label} ${leftLabel}: ${levelOptions(row.levels)[row.left].description}` },
  ]).filter((x): x is { key: string; text: string } => Boolean(x));
  return (
    <div className="space-y-1">
      {title && <div className="text-sm font-medium">{title}</div>}
      <div className="grid grid-cols-[auto_auto] sm:grid-cols-[minmax(8rem,1fr)_auto_auto] gap-x-2 sm:gap-x-4 gap-y-1 items-center">
        <div className="hidden sm:block" />
        <div className="text-xs font-semibold">{rightLabel}</div>
        <div className="text-xs font-semibold">{leftLabel}</div>
        {rows.map((row) => {
          const options = levelOptions(row.levels);
          const changed = row.right !== row.normal || row.left !== row.normal;
          return (
            <Fragment key={row.key}>
              <div className={`col-span-2 sm:col-span-1 text-sm pt-1 sm:pt-0 ${changed ? "font-semibold text-blue-950" : ""}`}>{row.label}</div>
              <Choice compact value={row.right} options={options} normal={row.normal} showDescription={false} onChange={row.onRight} />
              <Choice compact value={row.left} options={options} normal={row.normal} showDescription={false} onChange={row.onLeft} />
            </Fragment>
          );
        })}
      </div>
      {abnormal.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {abnormal.map((a) => <div key={a.key} className="text-xs text-blue-950">{a.text}</div>)}
        </div>
      )}
    </div>
  );
}

// Collapsible group of optional items; opens automatically when something is recorded
export function Optional({ title, active, children }: { title: string; active: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-dashed px-3 py-2" open={active || undefined}>
      <summary className="cursor-pointer text-sm font-medium select-none">{title}</summary>
      <div className="pt-3 space-y-4">{children}</div>
    </details>
  );
}
