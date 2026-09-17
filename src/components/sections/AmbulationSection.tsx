import type { Translations } from "../../i18n/translations";
import type { AssistanceId } from "../../types/edss";
import type { AmbulationResult } from "../../utils/edss";
import { assistanceLevels } from "../../utils/report";
import { Check } from "../controls";

type DocumentationField = "reportedDistance" | "reportedTime" | "measuredDistance";

export function AmbulationSection({ assistance, onAssistance, distance, onDistance, parsedDistance, restricted, onRestricted, documentation, onDocumentation, ambulation, t }: {
  assistance: AssistanceId;
  onAssistance: (value: AssistanceId) => void;
  distance: string;
  onDistance: (value: string) => void;
  parsedDistance: number | null;
  restricted: boolean;
  onRestricted: (value: boolean) => void;
  documentation: Record<DocumentationField, string>;
  onDocumentation: (field: DocumentationField, value: string) => void;
  ambulation: AmbulationResult | null;
  t: Translations;
}) {
  return (
    <section id="ambulation" className="space-y-3 p-3 md:p-4 rounded-xl bg-white border scroll-mt-36 lg:scroll-mt-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center min-w-9 h-9 rounded-lg text-lg font-bold tabular-nums ${ambulation ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-500"}`}>
          {ambulation?.score ?? 0}
        </span>
        <h2 className="font-semibold">{t.ambulation}</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium mb-1">{t.assistanceReq}</legend>
          {assistanceLevels(t).map((a) => {
            const selected = assistance === a.id;
            return (
              <label key={a.id} className={`flex items-start gap-2 rounded-lg px-2 py-1 cursor-pointer ${selected ? (a.id === "none" ? "bg-gray-100 font-medium" : "bg-blue-50 ring-1 ring-blue-200 font-medium text-blue-950") : "hover:bg-gray-50"}`}>
                <input type="radio" className="mt-1" name="assist" value={a.id} checked={selected} onChange={(e) => onAssistance(e.target.value as AssistanceId)} />
                <span className="text-sm">{a.label}</span>
              </label>
            );
          })}
        </fieldset>
        {assistance === "none" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="walking-distance">{t.maxWalkDist}</label>
            <input
              id="walking-distance"
              type="number"
              inputMode="numeric"
              className={`w-full rounded-xl border p-2 ${parsedDistance !== null && parsedDistance < 500 ? "border-blue-300 bg-blue-50" : ""}`}
              value={distance}
              min={0}
              max={2000}
              step={10}
              onChange={(e) => onDistance(e.target.value)}
            />
            <div className="text-xs opacity-70">{t.thresholds}</div>
            {(parsedDistance === null || parsedDistance >= 500) && (
              <Check label={t.ambulationRestricted} checked={restricted} onChange={onRestricted} />
            )}
          </div>
        )}
        <div className="md:col-span-2 space-y-2">
          <div className="text-xs text-gray-600">{t.ambulationDocumentation}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {(["reportedDistance", "reportedTime", "measuredDistance"] as const).map((field) => (
              <label key={field} className="space-y-1 text-sm">
                <span className="block">{t[field]}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="w-full rounded-xl border p-2"
                  value={documentation[field]}
                  onChange={(e) => onDocumentation(field, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
