import "server-only";
import { randomCode } from "./codes";
import { db } from "./db";
import { loyaltyCard, perkForRank, ranksToGrant } from "./loyalty";

/** Sorties validées à l'arrivée = tampons. */
export async function validatedVisits(userId: string) {
  return db.booking.count({ where: { userId, status: "CHECKED_IN" } });
}

/** Crée les cadeaux mérités qui n'existent pas encore (appelé après chaque validation d'arrivée). */
export async function grantRewards(userId: string) {
  const [visits, existing] = await Promise.all([
    validatedVisits(userId),
    db.reward.findMany({ where: { userId }, select: { rank: true } }),
  ]);
  for (const rank of ranksToGrant(
    visits,
    existing.map((r) => r.rank),
  )) {
    // @@unique([userId, rank]) : une validation concurrente ne crée pas de doublon.
    await db.reward
      .create({ data: { userId, rank, kind: perkForRank(rank), code: `CADEAU-${randomCode(5)}` } })
      .catch(() => null);
  }
}

export async function getLoyalty(userId: string) {
  const [visits, rewards] = await Promise.all([
    validatedVisits(userId),
    db.reward.findMany({
      where: { userId },
      orderBy: { rank: "asc" },
      include: { booking: { include: { slot: { include: { activity: { select: { title: true } } } } } } },
    }),
  ]);
  return { card: loyaltyCard(visits), visits, rewards };
}

export async function firstAvailableReward(userId: string) {
  return db.reward.findFirst({ where: { userId, status: "AVAILABLE" }, orderBy: { rank: "asc" } });
}

/** Rattache un cadeau disponible à une réservation (seulement s'il est encore disponible). */
export async function attachReward(rewardId: string, userId: string, bookingId: string) {
  const r = await db.reward.updateMany({
    where: { id: rewardId, userId, status: "AVAILABLE" },
    data: { status: "ATTACHED", bookingId },
  });
  return r.count === 1;
}

/** Réservation annulée : le cadeau redevient disponible. */
export async function releaseReward(bookingId: string) {
  await db.reward.updateMany({
    where: { bookingId, status: "ATTACHED" },
    data: { status: "AVAILABLE", bookingId: null },
  });
}

/** Arrivée validée : le cadeau est remis. */
export async function redeemReward(bookingId: string) {
  await db.reward.updateMany({
    where: { bookingId, status: "ATTACHED" },
    data: { status: "USED", usedAt: new Date() },
  });
}
