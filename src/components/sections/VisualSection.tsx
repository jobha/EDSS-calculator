import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { EyeAcuity } from "../../types/edss";
import type { VisualForm } from "../../types/forms";
import { formatEyeAcuity } from "../../utils/formatting";
import { Check, Choice, levelOptions, splitLevel, type ChoiceOption } from "../controls";

const EYE_ACUITIES: EyeAcuity[] = ["1.0", "0.68-0.99", "0.34-0.67", "0.21-0.33", "0.10-0.20", "lt_0.10"];

export function VisualSection({ value, onChange, t }: { value: VisualForm; onChange: Dispatch<SetStateAction<VisualForm>>; t: Translations }) {
  const set = (patch: Partial<VisualForm>) => onChange((prev) => ({ ...prev, ...patch }));
  const acuityOptions: ChoiceOption<EyeAcuity>[] = EYE_ACUITIES.map((a) => ({ value: a, short: formatEyeAcuity(a) }));
  const fieldOptions: ChoiceOption<VisualForm["visualFieldDeficit"]>[] = ([
    ["none", t.vfNone], ["mild", t.vfMild], ["moderate", t.vfModerate], ["marked", t.vfMarked],
  ] as const).map(([v, label], i) => ({ value: v, ...splitLevel(label, String(i)) }));

  return (
    <>
      <div className="space-y-4">
        <Choice label={t.rightEyeAcuity} value={value.rightEyeAcuity} options={acuityOptions} onChange={(v) => set({ rightEyeAcuity: v })} />
        <Choice label={t.leftEyeAcuity} value={value.leftEyeAcuity} options={acuityOptions} onChange={(v) => set({ leftEyeAcuity: v })} />
      </div>
      <div className="space-y-4">
        <Choice label={t.visualFieldDeficit} value={value.visualFieldDeficit} options={fieldOptions} onChange={(v) => set({ visualFieldDeficit: v })} />
        <Choice label={t.scotoma} value={value.scotoma} options={levelOptions(t.scotomaLevels)} onChange={(v) => set({ scotoma: v as VisualForm["scotoma"] })} />
        <Check label={t.discPallor} checked={value.discPallor} onChange={(checked) => set({ discPallor: checked })} />
      </div>
    </>
  );
}
