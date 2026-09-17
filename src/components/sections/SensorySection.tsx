import type { Dispatch, SetStateAction } from "react";
import type { Translations } from "../../i18n/translations";
import type { Severity } from "../../types/edss";
import type { SensoryForm } from "../../types/forms";
import { Choice, Toggles, splitLevel, type ChoiceOption } from "../controls";

type Prefix = "pt" | "vib" | "jp";
const LIMBS = ["RightArm", "LeftArm", "RightLeg", "LeftLeg"] as const;

export function SensorySection({ value, onChange, t }: { value: SensoryForm; onChange: Dispatch<SetStateAction<SensoryForm>>; t: Translations }) {
  const field = (prefix: Prefix, name: string) => (value as unknown as Record<string, unknown>)[`${prefix}${name}`];
  const limbAbbrev = { RightArm: t.rightArmAbbrev, LeftArm: t.leftArmAbbrev, RightLeg: t.rightLegAbbrev, LeftLeg: t.leftLegAbbrev };

  const modalities: { prefix: Prefix; label: string; options: ChoiceOption<Severity>[] }[] = [
    { prefix: "pt", label: t.painTouch, options: (["signs", "mild", "moderate", "marked", "absent"] as const).map((k) => ({ value: k, ...splitLevel(t.ptOptions[k], k) })) },
    { prefix: "vib", label: t.vibration, options: (["mild", "moderate", "marked"] as const).map((k) => ({ value: k, ...splitLevel(t.vibOptions[k], k) })) },
    { prefix: "jp", label: t.jointPosition, options: (["mild", "moderate", "marked"] as const).map((k) => ({ value: k, ...splitLevel(t.jpOptions[k], k) })) },
  ];

  const setSeverity = (prefix: Prefix, severity: Severity) => onChange((prev) => ({
    ...prev,
    [`${prefix}Severity`]: severity,
    // Clearing the severity clears the affected limbs
    ...(severity === "normal" ? { [`${prefix}Count`]: 0, ...Object.fromEntries(LIMBS.map((limb) => [`${prefix}${limb}`, false])) } : {}),
  }));
  const setLimb = (prefix: Prefix, limb: string, checked: boolean) => onChange((prev) => {
    const next = { ...prev, [`${prefix}${limb}`]: checked } as unknown as Record<string, unknown>;
    next[`${prefix}Count`] = LIMBS.filter((l) => next[`${prefix}${l}`]).length;
    return next as unknown as SensoryForm;
  });

  return (
    <>
      {modalities.map(({ prefix, label, options }) => {
        const severity = field(prefix, "Severity") as Severity;
        const count = field(prefix, "Count") as number;
        return (
          <div key={prefix} className={`space-y-2 ${prefix === "jp" ? "md:col-span-2" : ""}`}>
            <Choice label={label} value={severity} options={[{ value: "normal", short: "0" }, ...options]} onChange={(v) => setSeverity(prefix, v)} />
            <Toggles
              disabled={severity === "normal"}
              items={LIMBS.map((limb) => ({ key: limb, short: limbAbbrev[limb], checked: field(prefix, limb) as boolean }))}
              onToggle={(limb, checked) => setLimb(prefix, limb, checked)}
            />
            {severity !== "normal" && count === 0 && <div className="text-xs text-amber-800">{t.warnSensoryNoLimbs}</div>}
          </div>
        );
      })}
    </>
  );
}
