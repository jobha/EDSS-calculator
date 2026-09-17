import React, { type Dispatch, type SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import { ARM_MUSCLES, LEG_MUSCLES, type MuscleGroup, type PyramidalForm } from "../../types/forms";
import { Check, Choice, Toggles, type ChoiceOption } from "../controls";

const STRENGTH_OPTIONS: ChoiceOption<number>[] = [5, 4, 3, 2, 1, 0].map((v) => ({ value: v, short: String(v) }));

export function PyramidalSection({ value, onChange, t }: { value: PyramidalForm; onChange: Dispatch<SetStateAction<PyramidalForm>>; t: Translations }) {
  const strengthTable = (title: string, muscles: readonly MuscleGroup[]) => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-[auto_auto] sm:grid-cols-[minmax(9rem,1fr)_auto_auto] gap-x-2 sm:gap-x-4 gap-y-1 items-center">
        <div className="hidden sm:block text-xs opacity-60">{t.movement}</div>
        <div className="text-xs font-semibold">{t.rightAbbrev}</div>
        <div className="text-xs font-semibold">{t.leftAbbrev}</div>
        {muscles.map((m) => {
          const weak = value[`${m}R`] < 5 || value[`${m}L`] < 5;
          return (
            <React.Fragment key={m}>
              <div className={`col-span-2 sm:col-span-1 text-sm pt-1 sm:pt-0 ${weak ? "font-semibold text-blue-950" : ""}`}>{t.muscles[m]}</div>
              {(["R", "L"] as const).map((side) => (
                <Choice
                  key={side}
                  compact
                  value={value[`${m}${side}`]}
                  options={STRENGTH_OPTIONS}
                  normal={5}
                  showDescription={false}
                  onChange={(v) => onChange((prev) => ({ ...prev, [`${m}${side}`]: v }))}
                />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:col-span-2 grid 2xl:grid-cols-2 gap-x-8 gap-y-4">
        {strengthTable(t.upperLimbsMRC, ARM_MUSCLES)}
        {strengthTable(t.lowerLimbsMRC, LEG_MUSCLES)}
      </div>
      <div className="space-y-3">
        <div className="text-sm font-medium">{t.findings}</div>
        {([
          [t.hyperreflexia, "hyperreflexiaRight", "hyperreflexiaLeft"],
          [t.babinski, "babinskiRight", "babinskiLeft"],
          [t.clonus, "clonusRight", "clonusLeft"],
        ] as const).map(([label, rightKey, leftKey]) => (
          <Toggles
            key={rightKey}
            label={label}
            items={[
              { key: rightKey, short: t.rightAbbrev, checked: value[rightKey] },
              { key: leftKey, short: t.leftAbbrev, checked: value[leftKey] },
            ]}
            onToggle={(key, checked) => onChange((prev) => ({ ...prev, [key]: checked }))}
          />
        ))}
      </div>
      <div className="space-y-3 md:pt-8">
        <Check label={t.spasticGait} checked={value.spasticGait} onChange={(checked) => onChange((prev) => ({ ...prev, spasticGait: checked }))} />
        <Check label={t.fatigability} checked={value.fatigability} onChange={(checked) => onChange((prev) => ({ ...prev, fatigability: checked }))} />
      </div>
    </>
  );
}
