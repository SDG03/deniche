import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { z } from "zod";
import { TZ, inBrussels } from "./format";

export const weeklyEntrySchema = z.object({
  /** 0 = dimanche … 6 = samedi */
  weekday: z.number().int().min(0).max(6),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1),
  capacity: z.number().int().min(1).max(200),
});
export const weeklyTemplateSchema = z.array(weeklyEntrySchema);
export type WeeklyEntry = z.infer<typeof weeklyEntrySchema>;

export const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
/** Ordre d'affichage belge : lundi d'abord. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Instants (UTC) des créneaux d'un modèle hebdomadaire, à l'heure locale de
 * Bruxelles, pour `days` jours à partir de `from`. Les créneaux déjà passés
 * sont ignorés. Gère le changement d'heure (TZDate construit l'heure locale).
 */
export function generateSlotTimes(template: WeeklyEntry[], from: Date, days: number) {
  const start = inBrussels(from);
  const out: { startsAt: Date; capacity: number }[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const weekday = day.getDay();
    for (const entry of template) {
      if (entry.weekday !== weekday) continue;
      for (const time of entry.times) {
        const [h, m] = time.split(":").map(Number);
        const local = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, TZ);
        const startsAt = new Date(local.getTime());
        if (startsAt.getTime() > from.getTime()) out.push({ startsAt, capacity: entry.capacity });
      }
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
