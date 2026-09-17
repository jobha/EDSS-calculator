import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { BowelBladderForm, CatheterisationLevel } from "../../types/forms";
import { Choice, Optional, levelOptions, type ChoiceOption } from "../controls";

export function BowelBladderSection({ value, onChange, t }: { value: BowelBladderForm; onChange: Dispatch<SetStateAction<BowelBladderForm>>; t: Translations }) {
  const setLevel = (key: keyof BowelBladderForm) => (v: number) => onChange((prev) => ({ ...prev, [key]: v }));
  const catheterisationOptions: ChoiceOption<CatheterisationLevel>[] = (Object.keys(t.catheterisationLevels) as CatheterisationLevel[])
    .map((v) => ({ value: v, short: t.catheterisationLevels[v] }));

  return (
    <>
      <div className="space-y-4">
        <div className="text-sm font-semibold">{t.bladderSymptoms}</div>
        <Choice label={t.urinaryHesitancy} value={value.urinaryHesitancy} options={levelOptions(t.urinaryHesitancyLevels)} onChange={setLevel("urinaryHesitancy")} />
        <Choice label={t.urinaryUrgency} value={value.urinaryUrgency} options={levelOptions(t.urinaryUrgencyLevels)} onChange={setLevel("urinaryUrgency")} />
        <Choice label={t.catheterisation} value={value.catheterisation} options={catheterisationOptions} onChange={(v) => onChange((prev) => ({ ...prev, catheterisation: v }))} />
      </div>
      <div className="space-y-4">
        <div className="text-sm font-semibold">{t.bowelSymptoms}</div>
        <Choice label={t.bowelDysfunction} value={value.bowelDysfunction} options={levelOptions(t.bowelDysfunctionLevels)} onChange={setLevel("bowelDysfunction")} />
        <Optional title={`${t.sexualDysfunction} – ${t.documentedOnly.toLowerCase()}`} active={value.sexualDysfunction > 0}>
          <Choice label={t.sexualDysfunction} value={value.sexualDysfunction} options={levelOptions(t.sexualDysfunctionLevels)} onChange={setLevel("sexualDysfunction")} />
        </Optional>
      </div>
    </>
  );
}
