/**
 * Moteur de tarification dynamique de Déniche.
 *
 * Fonctions pures : aucune lecture d'horloge, aucune I/O. Le serveur appelle
 * `computePrice` à chaque affichage ET à la création d'une réservation (il est
 * l'unique source de vérité du prix). Les durées sont calculées en millisecondes
 * réelles entre deux instants UTC, donc un changement d'heure (ex. 25/10/2026)
 * ne décale jamais un palier.
 */

import { copy } from "./copy";

export type DiscountTier = {
  /** Le palier s'applique quand il reste au moins `minHours` heures. */
  minHours: number;
  pct: number;
};

export const DEFAULT_TIERS: DiscountTier[] = [
  { minHours: 72, pct: 0 },
  { minHours: 24, pct: 10 },
  { minHours: 6, pct: 20 },
  { minHours: 2, pct: 30 },
  { minHours: 0, pct: 40 },
];

export const PRICING_DEFAULTS = {
  floorPct: 50,
  quotaPct: 50,
  cutoffMinutes: 30,
  lowFillThreshold: 0.4,
  lowFillBonusPct: 10,
  lowFillWindowHours: 24,
  highFillThreshold: 0.8,
  roundingCents: 50,
  lockMinutes: 10,
} as const;

export type QuotaInput = {
  capacity: number;
  /** Places déjà vendues (ou bloquées) à prix réduit sur ce créneau. */
  discountedSold: number;
  /** Part maximale de la capacité vendable à prix réduit (0-100). */
  quotaPct?: number;
};

export type PriceInput = {
  basePriceCents: number;
  startsAt: Date;
  now: Date;
  tiers?: DiscountTier[];
  floorPct?: number;
  /** Taux de remplissage du créneau entre 0 et 1. */
  fillRate?: number;
  lastMinuteEnabled?: boolean;
  fillBonusEnabled?: boolean;
  cutoffMinutes?: number;
  quota?: QuotaInput;
};

export type PriceResult = {
  unitPriceCents: number;
  /** Réduction nominale appliquée (en points de %). */
  discountPct: number;
  tierLabel: string;
  /** Prochain instant où la réduction change (null si plus de changement avant la fermeture). */
  nextChangeAt: Date | null;
  nextDiscountPct: number | null;
  basePriceCents: number;
  floorCents: number;
  hoursLeft: number;
  isBookable: boolean;
  closesAt: Date;
  fillBonusApplied: boolean;
  quotaReached: boolean;
  /** Places encore disponibles à prix réduit (null si pas de quota fourni). */
  discountedSeatsLeft: number | null;
};

const HOUR_MS = 3_600_000;

export function sortTiers(tiers: DiscountTier[]): DiscountTier[] {
  return [...tiers].sort((a, b) => b.minHours - a.minHours);
}

function tierFor(hoursLeft: number, tiers: DiscountTier[]): { tier: DiscountTier; upper: number | null } {
  const sorted = sortTiers(tiers);
  for (let i = 0; i < sorted.length; i++) {
    if (hoursLeft >= sorted[i].minHours) {
      return { tier: sorted[i], upper: i === 0 ? null : sorted[i - 1].minHours };
    }
  }
  const last = sorted[sorted.length - 1] ?? { minHours: 0, pct: 0 };
  return { tier: last, upper: sorted.length > 1 ? sorted[sorted.length - 2].minHours : null };
}

type DiscountContext = {
  tiers: DiscountTier[];
  floorPct: number;
  fillRate: number;
  lastMinuteEnabled: boolean;
  fillBonusEnabled: boolean;
  quotaReached: boolean;
};

function discountAt(hoursLeft: number, ctx: DiscountContext) {
  const { tier, upper } = tierFor(hoursLeft, ctx.tiers);
  const base = { tier, upper, fillBonusApplied: false };
  if (!ctx.lastMinuteEnabled || ctx.quotaReached) return { ...base, pct: 0 };
  if (ctx.fillRate > PRICING_DEFAULTS.highFillThreshold) return { ...base, pct: 0 };

  let pct = Math.max(0, tier.pct);
  let fillBonusApplied = false;
  if (
    ctx.fillBonusEnabled &&
    ctx.fillRate < PRICING_DEFAULTS.lowFillThreshold &&
    hoursLeft < PRICING_DEFAULTS.lowFillWindowHours
  ) {
    pct += PRICING_DEFAULTS.lowFillBonusPct;
    fillBonusApplied = true;
  }
  const maxPct = Math.max(0, 100 - ctx.floorPct);
  return { tier, upper, pct: Math.min(pct, maxPct), fillBonusApplied };
}

/** Prix unitaire après réduction, arrondi au 0,50 € le plus proche, jamais sous le plancher. */
export function applyDiscount(basePriceCents: number, discountPct: number, floorPct: number): number {
  if (discountPct <= 0) return basePriceCents;
  const step = PRICING_DEFAULTS.roundingCents;
  const floorCents = Math.ceil((basePriceCents * floorPct) / 100);
  const raw = (basePriceCents * (100 - discountPct)) / 100;
  let rounded = Math.round(raw / step) * step;
  if (rounded < floorCents) rounded = Math.ceil(floorCents / step) * step;
  return Math.min(rounded, basePriceCents);
}

export function tierLabelFor(pct: number, minHours: number, upper: number | null, fillBonus: boolean): string {
  if (pct === 0) return copy.pricingLabels.full;
  const range =
    upper === null
      ? copy.pricingLabels.above(minHours)
      : minHours === 0
        ? copy.pricingLabels.below(upper)
        : copy.pricingLabels.between(minHours, upper);
  return fillBonus ? `${range} · ${copy.pricingLabels.calmBonus}` : range;
}

/** Explique pourquoi un créneau reste au plein tarif alors que le palier prévoit une réduction. */
function explainZero(ctx: DiscountContext, tierPct: number): string | null {
  if (tierPct <= 0) return null;
  if (!ctx.lastMinuteEnabled) return copy.pricingLabels.fixed;
  if (ctx.quotaReached) return copy.pricingLabels.quotaReached;
  if (ctx.fillRate > PRICING_DEFAULTS.highFillThreshold) return copy.pricingLabels.almostFull;
  return null;
}

export function discountedSeatsLeft(quota: QuotaInput): number {
  const pct = quota.quotaPct ?? PRICING_DEFAULTS.quotaPct;
  const max = Math.floor((quota.capacity * pct) / 100);
  return Math.max(0, max - quota.discountedSold);
}

export function computePrice(input: PriceInput): PriceResult {
  const {
    basePriceCents,
    startsAt,
    now,
    tiers = DEFAULT_TIERS,
    floorPct = PRICING_DEFAULTS.floorPct,
    fillRate = 0,
    lastMinuteEnabled = true,
    fillBonusEnabled = true,
    cutoffMinutes = PRICING_DEFAULTS.cutoffMinutes,
    quota,
  } = input;

  if (!Number.isInteger(basePriceCents) || basePriceCents < 0) {
    throw new Error("basePriceCents doit être un entier positif (centimes)");
  }

  const msLeft = startsAt.getTime() - now.getTime();
  const hoursLeft = msLeft / HOUR_MS;
  const closesAt = new Date(startsAt.getTime() - cutoffMinutes * 60_000);
  const isBookable = now.getTime() < closesAt.getTime();

  const seatsLeft = quota ? discountedSeatsLeft(quota) : null;
  const ctx: DiscountContext = {
    tiers: tiers.length ? tiers : DEFAULT_TIERS,
    floorPct: clamp(floorPct, 0, 100),
    fillRate: clamp(fillRate, 0, 1),
    lastMinuteEnabled,
    fillBonusEnabled,
    quotaReached: seatsLeft === 0,
  };

  const current = discountAt(hoursLeft, ctx);
  const unitPriceCents = applyDiscount(basePriceCents, current.pct, ctx.floorPct);

  // Prochain changement : on teste chaque seuil futur (paliers + fenêtre du bonus)
  // juste après son franchissement, tant que les réservations sont ouvertes.
  let nextChangeAt: Date | null = null;
  let nextDiscountPct: number | null = null;
  if (isBookable) {
    const thresholds = new Set<number>(ctx.tiers.map((t) => t.minHours));
    if (fillBonusEnabled) thresholds.add(PRICING_DEFAULTS.lowFillWindowHours);
    const future = [...thresholds].filter((h) => h > 0 && h < hoursLeft).sort((a, b) => b - a);
    for (const h of future) {
      const at = new Date(startsAt.getTime() - h * HOUR_MS);
      if (at.getTime() >= closesAt.getTime()) break;
      const next = discountAt(h - 1e-9, ctx);
      if (next.pct !== current.pct) {
        nextChangeAt = at;
        nextDiscountPct = next.pct;
        break;
      }
    }
  }

  return {
    unitPriceCents,
    discountPct: current.pct,
    tierLabel:
      explainZero(ctx, current.tier.pct) ??
      tierLabelFor(current.pct, current.tier.minHours, current.upper, current.fillBonusApplied),
    nextChangeAt,
    nextDiscountPct,
    basePriceCents,
    floorCents: Math.ceil((basePriceCents * ctx.floorPct) / 100),
    hoursLeft,
    isBookable,
    closesAt,
    fillBonusApplied: current.fillBonusApplied && current.pct > 0,
    quotaReached: ctx.quotaReached,
    discountedSeatsLeft: seatsLeft,
  };
}

export type BookingQuote = {
  people: number;
  discountedSeats: number;
  fullPriceSeats: number;
  unitPriceCents: number;
  totalCents: number;
};

/**
 * Total d'une réservation de `people` places. Si le quota de places réduites
 * est presque atteint, seules les places restantes du quota sont réduites.
 */
export function quoteBooking(price: PriceResult, people: number): BookingQuote {
  if (!Number.isInteger(people) || people < 1) throw new Error("Nombre de personnes invalide");
  const discounted = price.discountPct > 0 ? Math.min(people, price.discountedSeatsLeft ?? people) : 0;
  const full = people - discounted;
  return {
    people,
    discountedSeats: discounted,
    fullPriceSeats: full,
    unitPriceCents: price.unitPriceCents,
    totalCents: discounted * price.unitPriceCents + full * price.basePriceCents,
  };
}

/** Courbe de prix pour l'aperçu partenaire : un point par heure, de `fromHours` à 0. */
export function priceCurve(
  params: Omit<PriceInput, "startsAt" | "now" | "quota">,
  fromHours = 96,
): { hoursLeft: number; unitPriceCents: number; discountPct: number }[] {
  const startsAt = new Date(Date.UTC(2030, 0, 10, 12));
  const points = [];
  for (let h = fromHours; h >= 0; h--) {
    const now = new Date(startsAt.getTime() - h * HOUR_MS);
    const r = computePrice({ ...params, startsAt, now, cutoffMinutes: 0 });
    points.push({ hoursLeft: h, unitPriceCents: r.unitPriceCents, discountPct: r.discountPct });
  }
  return points;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
