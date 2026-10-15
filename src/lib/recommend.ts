import type { ActivitySummary } from "./catalog";
import { dayKey } from "./format";

/** Hash simple et stable (FNV-1a) pour des choix « du jour » reproductibles. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** La Déniche du jour : change chaque jour, identique pour tout le monde. */
export function pickOfTheDay(list: ActivitySummary[], now: Date) {
  const candidates = list.filter((a) => a.nextSlot).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!candidates.length) return null;
  return candidates[hash(`deniche-${dayKey(now)}`) % candidates.length];
}

/** Créneaux de dernière minute (< 24 h) avec réduction, une carte par activité. */
export function lastMinute(list: ActivitySummary[], now: Date, maxKm = 60) {
  const limit = now.getTime() + 24 * 3_600_000;
  return list
    .flatMap((a): ActivitySummary[] => {
      const slot = a.slots.find((s) => s.bookable && s.discountPct > 0 && Date.parse(s.startsAt) < limit);
      return slot && a.distanceKm <= maxKm ? [{ ...a, nextSlot: slot }] : [];
    })
    .sort((a, b) => Date.parse(a.nextSlot!.startsAt) - Date.parse(b.nextSlot!.startsAt));
}

/** Activités dans des catégories jamais réservées, la plus proche par catégorie. */
export function neverTried(list: ActivitySummary[], triedCategories: Set<string>) {
  const byCat = new Map<string, ActivitySummary>();
  for (const a of [...list].sort((x, y) => x.distanceKm - y.distanceKm)) {
    if (triedCategories.has(a.category) || byCat.has(a.category) || !a.nextSlot) continue;
    byCat.set(a.category, a);
  }
  return [...byCat.values()];
}

/**
 * « Surprends-moi » : tirage pondéré vers les catégories jamais essayées, les
 * créneaux proches dans le temps et les activités à moins de 40 km.
 */
export function surprise(list: ActivitySummary[], triedCategories: Set<string>, now: Date, rnd = Math.random) {
  const soon = now.getTime() + 3 * 86_400_000;
  const pool = list
    .map((a) => {
      const slot = a.slots.find((s) => s.bookable && Date.parse(s.startsAt) < soon) ?? a.nextSlot;
      if (!slot) return null;
      let w = 1;
      if (!triedCategories.has(a.category)) w *= 3;
      if (a.distanceKm < 40) w *= 2;
      if (slot.discountPct > 0) w *= 1.5;
      return { a, slot, w };
    })
    .filter((x): x is { a: ActivitySummary; slot: NonNullable<ActivitySummary["nextSlot"]>; w: number } => !!x);
  const total = pool.reduce((t, x) => t + x.w, 0);
  let r = rnd() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) return x;
  }
  return pool[0] ?? null;
}
