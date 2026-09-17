import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { MentalForm } from "../../types/forms";
import { Choice, type ChoiceOption } from "../controls";

// Stored as exclusive flags; shown as levels
const COGNITION_KEYS = ["signsOnlyCognition", "lightlyReducedCognition", "moderatelyReducedCognition", "markedlyReducedCognition", "pronouncedDementia"] as const;
const FATIGUE_KEYS = ["mildFatigue", "moderateToSevereFatigue"] as const;

export function CerebralSection({ value, onChange, t }: { value: MentalForm; onChange: Dispatch<SetStateAction<MentalForm>>; t: Translations }) {
  const levelOf = (keys: readonly (keyof MentalForm)[]) => keys.findIndex((k) => value[k]) + 1;
  const setLevel = (keys: readonly (keyof MentalForm)[]) => (level: number) =>
    onChange((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k, i) => [k, i + 1 === level])) }));

  const cognitionOptions: ChoiceOption<number>[] = [
    { value: 0, short: "0" },
    ...[t.signsOnlyCog, t.lightlyReducedCog, t.moderatelyReducedCog, t.markedlyReducedCog, t.pronouncedDementia]
      .map((description, i) => ({ value: i + 1, short: String(i + 1), description })),
  ];
  const fatigueOptions: ChoiceOption<number>[] = [
    { value: 0, short: "0" },
    { value: 1, short: "1", description: t.mildFatigue },
    { value: 2, short: "2–3", description: t.moderateSevereFatigue },
  ];

  return (
    <>
      <Choice label={t.cognitiveFunction} value={levelOf(COGNITION_KEYS)} options={cognitionOptions} onChange={setLevel(COGNITION_KEYS)} />
      <div className="space-y-2">
        <Choice label={t.fatigue} value={levelOf(FATIGUE_KEYS)} options={fatigueOptions} onChange={setLevel(FATIGUE_KEYS)} />
        <div className="text-xs text-gray-600">{t.cerebralNote}</div>
      </div>
    </>
  );
}
