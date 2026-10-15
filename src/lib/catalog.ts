import "server-only";
import { cookies } from "next/headers";
import { getCategory } from "./categories";
import { db } from "./db";
import { addDays } from "date-fns";
import { dayKey, inBrussels, startOfBrusselsDay } from "./format";
import { estimateDriveMinutes, haversineKm, LIEGE, parsePosition, POSITION_COOKIE, type LatLng } from "./geo";
import { HORIZON_DAYS, refreshInventory } from "./inventory";
import { priceSlot } from "./activity-pricing";

export type SlotView = {
  id: string;
  startsAt: string;
  seatsLeft: number;
  capacity: number;
  unitPriceCents: number;
  basePriceCents: number;
  discountPct: number;
  bookable: boolean;
  nextChangeAt: string | null;
  nextDiscountPct: number | null;
  discountedSeatsLeft: number | null;
  tierLabel: string;
};

export type ActivitySummary = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: string;
  categoryLabel: string;
  city: string;
  image: string;
  imageAlt: string;
  latitude: number;
  longitude: number;
  setting: "INDOOR" | "OUTDOOR" | "MIXED";
  level: "EASY" | "MEDIUM" | "HARD";
  durationMin: number;
  minPeople: number;
  maxPeople: number;
  basePriceCents: number;
  /** Prix le plus bas parmi les créneaux réservables (sinon prix de base). */
  fromPriceCents: number;
  bestDiscountPct: number;
  nextSlot: SlotView | null;
  distanceKm: number;
  driveMin: number;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  slots: SlotView[];
};

export async function getUserPosition(): Promise<{ position: LatLng; isDefault: boolean }> {
  const jar = await cookies();
  const pos = parsePosition(jar.get(POSITION_COOKIE)?.value);
  return pos ? { position: pos, isDefault: false } : { position: LIEGE, isDefault: true };
}

export function slotView(
  rules: Parameters<typeof priceSlot>[0],
  slot: { id: string; startsAt: Date; capacity: number; bookedCount: number; discountedSold: number },
  now: Date,
): SlotView {
  const p = priceSlot(rules, slot, now);
  const seatsLeft = Math.max(0, slot.capacity - slot.bookedCount);
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    seatsLeft,
    capacity: slot.capacity,
    unitPriceCents: p.unitPriceCents,
    basePriceCents: p.basePriceCents,
    discountPct: p.discountPct,
    bookable: p.isBookable && seatsLeft > 0,
    nextChangeAt: p.nextChangeAt?.toISOString() ?? null,
    nextDiscountPct: p.nextDiscountPct,
    discountedSeatsLeft: p.discountedSeatsLeft,
    tierLabel: p.tierLabel,
  };
}

export function imageAlt(title: string, category: string, index = 0) {
  const label = getCategory(category).label.toLowerCase();
  return index === 0 ? `${title} — ${label}` : `${title}, photo ${index + 1}`;
}

/** Toutes les activités publiées avec leurs créneaux à venir, prix calculés côté serveur. */
export async function getCatalog(opts: { now?: Date; position?: LatLng } = {}) {
  const now = opts.now ?? new Date();
  await refreshInventory(now);
  const position = opts.position ?? (await getUserPosition()).position;
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const activities = await db.activity.findMany({
    where: { published: true },
    include: {
      slots: { where: { startsAt: { gt: now, lt: horizon } }, orderBy: { startsAt: "asc" } },
      reviews: { select: { rating: true } },
    },
  });

  return activities.map((a): ActivitySummary => {
    const slots = a.slots.map((s) => slotView(a, s, now));
    const bookable = slots.filter((s) => s.bookable);
    const images = a.images as string[];
    const distanceKm = haversineKm(position, { lat: a.latitude, lng: a.longitude });
    const ratingCount = a.reviews.length;
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      tagline: a.tagline,
      category: a.category,
      categoryLabel: getCategory(a.category).label,
      city: a.city,
      image: images[0],
      imageAlt: imageAlt(a.title, a.category),
      latitude: a.latitude,
      longitude: a.longitude,
      setting: a.setting,
      level: a.level,
      durationMin: a.durationMin,
      minPeople: a.minPeople,
      maxPeople: a.maxPeople,
      basePriceCents: a.basePriceCents,
      fromPriceCents: bookable.length ? Math.min(...bookable.map((s) => s.unitPriceCents)) : a.basePriceCents,
      bestDiscountPct: bookable.length ? Math.max(...bookable.map((s) => s.discountPct)) : 0,
      nextSlot: bookable[0] ?? null,
      distanceKm,
      driveMin: estimateDriveMinutes(distanceKm),
      ratingAvg: ratingCount ? a.reviews.reduce((t, r) => t + r.rating, 0) / ratingCount : 0,
      ratingCount,
      tags: a.tags as string[],
      slots,
    };
  });
}

// ---------------------------------------------------------------- filtres

export type When = "today" | "tomorrow" | "weekend" | "date" | undefined;

export type CatalogFilters = {
  q?: string;
  category?: string;
  when?: When;
  date?: string;
  people?: number;
  budget?: number; // euros
  distance?: number; // km
  setting?: "INDOOR" | "OUTDOOR";
  sort?: "distance" | "price" | "next";
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) || undefined;
  const num = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const when = one("quand");
  const setting = one("cadre");
  const sort = one("tri");
  return {
    q: one("q")?.slice(0, 60),
    category: one("categorie"),
    when: ["today", "tomorrow", "weekend", "date"].includes(when ?? "") ? (when as When) : undefined,
    date: one("date")?.match(/^\d{4}-\d{2}-\d{2}$/) ? one("date") : undefined,
    people: num("personnes"),
    budget: num("budget"),
    distance: num("distance"),
    setting: setting === "INDOOR" || setting === "OUTDOOR" ? setting : undefined,
    sort: sort === "price" || sort === "next" ? sort : "distance",
  };
}

/** Fenêtre [début, fin[ en UTC pour un filtre « quand ». */
export function whenWindow(f: CatalogFilters, now = new Date()): [Date, Date] | null {
  const today = dayKey(now);
  const local = inBrussels(now);
  const dayStart = (key: string) => startOfBrusselsDay(key);
  const plus = (key: string, n: number) => dayKey(addDays(inBrussels(dayStart(key)), n));
  switch (f.when) {
    case "today":
      return [now, dayStart(plus(today, 1))];
    case "tomorrow":
      return [dayStart(plus(today, 1)), dayStart(plus(today, 2))];
    case "weekend": {
      const dow = local.getDay(); // 0 dimanche
      const toSat = dow === 0 ? -1 : 6 - dow;
      const sat = plus(today, toSat);
      return [dow === 0 || dow === 6 ? now : dayStart(sat), dayStart(plus(sat, 2))];
    }
    case "date":
      return f.date ? [dayStart(f.date), dayStart(plus(f.date, 1))] : null;
    default:
      return null;
  }
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function applyFilters(list: ActivitySummary[], f: CatalogFilters, now = new Date()) {
  const window = whenWindow(f, now);
  const people = f.people ?? 1;
  const q = f.q ? normalize(f.q) : null;

  const out = list.flatMap((a): ActivitySummary[] => {
    if (f.category && a.category !== f.category) return [];
    if (f.setting && a.setting !== f.setting && a.setting !== "MIXED") return [];
    if (f.distance && a.distanceKm > f.distance) return [];
    if (people > a.maxPeople) return [];
    if (q) {
      const hay = normalize([a.title, a.tagline, a.city, a.categoryLabel, ...a.tags].join(" "));
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return [];
    }
    // Créneaux compatibles avec la date et le nombre de personnes
    const slots = a.slots.filter(
      (s) =>
        s.bookable &&
        s.seatsLeft >= people &&
        (!window || (new Date(s.startsAt) >= window[0] && new Date(s.startsAt) < window[1])),
    );
    if ((window || f.people) && !slots.length) return [];
    const pool = slots.length ? slots : a.slots.filter((s) => s.bookable);
    const fromPriceCents = pool.length ? Math.min(...pool.map((s) => s.unitPriceCents)) : a.basePriceCents;
    if (f.budget && fromPriceCents > f.budget * 100) return [];
    return [
      {
        ...a,
        fromPriceCents,
        bestDiscountPct: pool.length ? Math.max(...pool.map((s) => s.discountPct)) : 0,
        nextSlot: pool[0] ?? null,
      },
    ];
  });

  const far = Number.MAX_SAFE_INTEGER;
  out.sort((a, b) => {
    if (f.sort === "price") return a.fromPriceCents - b.fromPriceCents || a.distanceKm - b.distanceKm;
    if (f.sort === "next")
      return (
        (a.nextSlot ? Date.parse(a.nextSlot.startsAt) : far) - (b.nextSlot ? Date.parse(b.nextSlot.startsAt) : far)
      );
    return a.distanceKm - b.distanceKm;
  });
  return out;
}

export function countActiveFilters(f: CatalogFilters) {
  return [f.category, f.when, f.people && f.people > 1, f.budget, f.distance, f.setting].filter(Boolean).length;
}
