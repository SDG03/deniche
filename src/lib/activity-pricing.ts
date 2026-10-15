import { z } from "zod";
import { computePrice, DEFAULT_TIERS, type DiscountTier } from "./pricing";

export const tiersSchema = z
  .array(z.object({ minHours: z.number().min(0).max(24 * 14), pct: z.number().int().min(0).max(90) }))
  .min(1)
  .max(8);

export type PricingRules = {
  basePriceCents: number;
  lastMinuteEnabled: boolean;
  discountTiers: unknown;
  floorPct: number;
  quotaPct: number;
  fillBonusEnabled: boolean;
  cutoffMinutes: number;
};

export type SlotLike = { startsAt: Date; capacity: number; bookedCount: number; discountedSold: number };

export function parseTiers(raw: unknown): DiscountTier[] {
  const r = tiersSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_TIERS;
}

/** Prix d'un créneau pour une activité donnée — utilisé partout (affichage ET serveur). */
export function priceSlot(rules: PricingRules, slot: SlotLike, now: Date) {
  return computePrice({
    basePriceCents: rules.basePriceCents,
    startsAt: slot.startsAt,
    now,
    tiers: parseTiers(rules.discountTiers),
    floorPct: rules.floorPct,
    fillRate: slot.capacity > 0 ? slot.bookedCount / slot.capacity : 1,
    lastMinuteEnabled: rules.lastMinuteEnabled,
    fillBonusEnabled: rules.fillBonusEnabled,
    cutoffMinutes: rules.cutoffMinutes,
    quota: { capacity: slot.capacity, discountedSold: slot.discountedSold, quotaPct: rules.quotaPct },
  });
}
