import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { CerebellarForm } from "../../types/forms";
import { Check, Choice, MultiChoice, levelOptions } from "../controls";

export function CerebellarSection({ value, onChange, t }: { value: CerebellarForm; onChange: Dispatch<SetStateAction<CerebellarForm>>; t: Translations }) {
  const setLevel = (key: keyof CerebellarForm) => (v: number) => onChange((prev) => ({ ...prev, [key]: v }));
  const limbs = ([
    ["limbAtaxiaRightArm", t.rightArmAbbrev],
    ["limbAtaxiaLeftArm", t.leftArmAbbrev],
    ["limbAtaxiaRightLeg", t.rightLegAbbrev],
    ["limbAtaxiaLeftLeg", t.leftLegAbbrev],
  ] as const).map(([key, abbrev]) => [abbrev, value[key], setLevel(key)] as const);

  return (
    <>
      <div className="space-y-4">
        <MultiChoice label={t.limbAtaxia} entries={limbs} labels={t.limbAtaxiaLevels} />
        <Choice label={t.headTremor} value={value.headTremor} options={levelOptions(t.headTremorLevels)} onChange={setLevel("headTremor")} />
        <Choice label={t.otherCerebellar} value={value.otherCerebellar} options={levelOptions(t.otherCerebellarLevels)} onChange={setLevel("otherCerebellar")} />
      </div>
      <div className="space-y-4">
        <Choice label={t.gaitAtaxia} value={value.gaitAtaxia} options={levelOptions(t.gaitAtaxiaLevels)} onChange={setLevel("gaitAtaxia")} />
        <Choice label={t.truncalAtaxia} value={value.truncalAtaxia} options={levelOptions(t.truncalAtaxiaLevels)} onChange={setLevel("truncalAtaxia")} />
        <Choice label={t.tandemWalking} value={value.tandemWalking} options={levelOptions(t.tandemWalkingLevels)} onChange={setLevel("tandemWalking")} />
        <Choice label={t.romberg} value={value.romberg} options={levelOptions(t.rombergLevels)} onChange={setLevel("romberg")} />
        <Check label={t.unableCoordMovements} checked={value.inabilityCoordinatedMovements} onChange={(checked) => onChange((prev) => ({ ...prev, inabilityCoordinatedMovements: checked }))} />
        <div className="text-xs text-gray-600">{t.cerebellarNote}</div>
      </div>
    </>
  );
}
