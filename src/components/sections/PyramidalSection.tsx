import React, { type Dispatch, type SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import { ARM_MUSCLES, LEG_MUSCLES, PYRAMIDAL_SIDED_DEFAULTS, REFLEXES, type MuscleGroup, type PyramidalForm, type PyramidalSidedItem } from "../../types/forms";
import { Choice, Optional, SidedGrid, levelOptions, type ChoiceOption, type SidedRow } from "../controls";

const STRENGTH_OPTIONS: ChoiceOption<number>[] = [5, 4, 3, 2, 1, 0].map((v) => ({ value: v, short: String(v) }));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PyramidalSection({ value, onChange, t }: { value: PyramidalForm; onChange: Dispatch<SetStateAction<PyramidalForm>>; t: Translations }) {
  const set = (key: string) => (v: number | string) => onChange((prev) => ({ ...prev, [key]: v }));
  const record = value as unknown as Record<string, number>;

  const sidedRow = (key: string, label: string, levels: readonly string[], normal: number): SidedRow => ({
    key, label, levels, normal,
    right: record[`${key}R`],
    left: record[`${key}L`],
    onRight: set(`${key}R`),
    onLeft: set(`${key}L`),
  });
  const item = (key: PyramidalSidedItem, label: string, levels: readonly string[]) => sidedRow(key, label, levels, PYRAMIDAL_SIDED_DEFAULTS[key]);

  const functionalRows = [
    item("pronation", t.pronation, t.driftLevels),
    item("downwardDrift", t.downwardDrift, t.driftLevels),
    item("legSinking", t.legSinking, t.legSinkingLevels),
    item("heelWalking", t.heelWalking, t.heelToeLevels),
    item("toeWalking", t.toeWalking, t.heelToeLevels),
    item("hopping", t.hopping, t.hoppingLevels),
  ];
  const functionalActive = functionalRows.some((r) => r.right !== r.normal || r.left !== r.normal) || Boolean(value.legLiftDegreesR || value.legLiftDegreesL);

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
                <Choice key={side} compact value={value[`${m}${side}`]} options={STRENGTH_OPTIONS} normal={5} showDescription={false} onChange={set(`${m}${side}`)} />
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

      <div className="md:col-span-2 grid 2xl:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-2">
          <SidedGrid
            title={t.reflexes}
            rightLabel={t.rightAbbrev}
            leftLabel={t.leftAbbrev}
            rows={[
              ...REFLEXES.map((r) => sidedRow(`reflex${capitalize(r)}`, t.reflexNames[r], t.reflexLevels, 2)),
              item("plantar", t.plantarResponse, t.plantarLevels),
              item("cutaneous", t.cutaneousReflexes, t.cutaneousLevels),
              item("palmomental", t.palmomental, t.palmomentalLevels),
            ]}
          />
          <div className="text-xs text-gray-600">{t.pyramidalSignsNote}</div>
        </div>

        <div className="space-y-4">
          <SidedGrid
            title={t.spasticity}
            rightLabel={t.rightAbbrev}
            leftLabel={t.leftAbbrev}
            rows={[item("spasticityArms", t.spasticityArms, t.spasticityLevels), item("spasticityLegs", t.spasticityLegs, t.spasticityLevels)]}
          />
          <Choice label={t.gaitSpasticity} value={value.gaitSpasticity} options={levelOptions(t.gaitSpasticityLevels)} onChange={set("gaitSpasticity")} />
          <Choice label={t.overallMotorPerformance} value={value.overallMotorPerformance} options={levelOptions(t.motorPerformanceLevels)} onChange={set("overallMotorPerformance")} />
        </div>
      </div>

      <div className="md:col-span-2">
        <Optional title={t.functionalTests} active={functionalActive}>
          <SidedGrid rows={functionalRows} rightLabel={t.rightAbbrev} leftLabel={t.leftAbbrev} />
          <div className="space-y-1">
            <div className="text-sm font-medium">{t.legLiftDegrees}</div>
            <div className="flex flex-wrap gap-4">
              {(["R", "L"] as const).map((side) => (
                <label key={side} className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-semibold">{side === "R" ? t.rightAbbrev : t.leftAbbrev}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={90}
                    className="w-20 rounded-lg border p-1"
                    value={value[`legLiftDegrees${side}`]}
                    onChange={(e) => set(`legLiftDegrees${side}`)(e.target.value)}
                  />
                  °
                </label>
              ))}
            </div>
          </div>
        </Optional>
      </div>
    </>
  );
}
