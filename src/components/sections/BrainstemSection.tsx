import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { BrainstemForm } from "../../types/forms";
import { Check, Choice, MultiChoice, levelOptions, splitLevel, type ChoiceOption } from "../controls";

export function BrainstemSection({ value, onChange, t }: { value: BrainstemForm; onChange: Dispatch<SetStateAction<BrainstemForm>>; t: Translations }) {
  const setLevel = (key: keyof BrainstemForm) => (v: number) => onChange((prev) => ({ ...prev, [key]: v }));
  const nystagmusOptions: ChoiceOption<BrainstemForm["nystagmus"]>[] = ([
    ["none", t.nystagmusNone], ["mild", t.nystagmusMild], ["clear", t.nystagmusClear], ["spontaneous", t.nystagmusSpontaneous],
  ] as const).map(([v, label], i) => ({ value: v, ...splitLevel(label, String(i)) }));

  const sided = [
    [t.facialSensibility, "facialSensRight", "facialSensLeft", [t.facialSensibility0, t.facialSensibility1, t.facialSensibility2, t.facialSensibility3, t.facialSensibility4]],
    [t.facialSymmetry, "facialSymRight", "facialSymLeft", [t.facialSymmetry0, t.facialSymmetry1, t.facialSymmetry2, t.facialSymmetry3, t.facialSymmetry4]],
    [t.hearing, "hearingRight", "hearingLeft", [t.hearing0, t.hearing1, t.hearing2, t.hearing3, t.hearing4]],
  ] as const;

  return (
    <>
      <div className="space-y-4">
        <Choice label={t.eyeMotility} value={value.eyeMotilityLevel} options={levelOptions([t.eyeMotility0, t.eyeMotility1, t.eyeMotility2, t.eyeMotility3, t.eyeMotility4])} onChange={setLevel("eyeMotilityLevel")} />
        <Choice label={t.nystagmus} value={value.nystagmus} options={nystagmusOptions} onChange={(v) => onChange((prev) => ({ ...prev, nystagmus: v }))} />
        <Check label={t.ino} checked={value.ino} onChange={(checked) => onChange((prev) => ({ ...prev, ino: checked }))} />
        <Choice label={t.dysarthria} value={value.dysarthriaLevel} options={levelOptions(t.dysarthriaLevels)} onChange={setLevel("dysarthriaLevel")} />
        <Choice label={t.dysphagia} value={value.dysphagiaLevel} options={levelOptions(t.dysphagiaLevels)} onChange={setLevel("dysphagiaLevel")} />
        <Choice label={t.otherCranialNerves} value={value.otherCranialNerves} options={levelOptions(t.otherCranialNervesLevels)} onChange={setLevel("otherCranialNerves")} />
      </div>
      <div className="space-y-4">
        {sided.map(([label, rightKey, leftKey, levels]) => (
          <MultiChoice
            key={rightKey}
            label={label}
            labels={levels}
            entries={[
              [t.rightAbbrev, value[rightKey], setLevel(rightKey)],
              [t.leftAbbrev, value[leftKey], setLevel(leftKey)],
            ]}
          />
        ))}
      </div>
    </>
  );
}
