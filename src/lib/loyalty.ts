/**
 * Carte fidélité — règles pures (testées dans loyalty.test.ts).
 *
 * Un tampon par sortie validée à l'arrivée par le partenaire (pas à la simple
 * réservation : on récompense les gens qui viennent vraiment). Tous les
 * STAMPS_PER_REWARD tampons, un cadeau à utiliser sur place. Les cadeaux
 * tournent dans PERKS, sans impact sur le prix payé.
 */
import { copy } from "./copy";

export const STAMPS_PER_REWARD = 3;

export const PERKS = ["drink", "snack", "drink", "souvenir"] as const;
export type PerkKind = (typeof PERKS)[number];

export function perkLabel(kind: string) {
  return copy.loyalty.perks[kind as PerkKind] ?? copy.loyalty.perks.drink;
}

/** Cadeau correspondant au n-ième palier (1 = premier cadeau). */
export function perkForRank(rank: number): PerkKind {
  return PERKS[(rank - 1) % PERKS.length];
}

export type LoyaltyCard = {
  /** tampons sur la carte en cours (0 à STAMPS_PER_REWARD − 1) */
  stamps: number;
  /** sorties restantes avant le prochain cadeau */
  toNext: number;
  /** nombre total de cadeaux gagnés */
  earned: number;
  nextPerk: PerkKind;
};

export function loyaltyCard(validatedVisits: number): LoyaltyCard {
  const visits = Math.max(0, Math.floor(validatedVisits));
  const earned = Math.floor(visits / STAMPS_PER_REWARD);
  const stamps = visits % STAMPS_PER_REWARD;
  return { stamps, toNext: STAMPS_PER_REWARD - stamps, earned, nextPerk: perkForRank(earned + 1) };
}

/** Rangs des cadeaux à créer, connaissant ceux déjà accordés (idempotent). */
export function ranksToGrant(validatedVisits: number, grantedRanks: number[]) {
  const { earned } = loyaltyCard(validatedVisits);
  const have = new Set(grantedRanks);
  return Array.from({ length: earned }, (_, i) => i + 1).filter((r) => !have.has(r));
}
