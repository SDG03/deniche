import "server-only";
import { db } from "./db";
import { generateSlotTimes, weeklyTemplateSchema } from "./schedule";

export const HORIZON_DAYS = 21;
let lastTopUp = 0;

/**
 * Libère les places bloquées par des checkouts abandonnés (verrou de 10 min
 * expiré). Chaque réservation est traitée dans sa propre transaction et ne
 * libère ses places qu'une seule fois (updateMany conditionnel sur le statut).
 */
export async function releaseExpiredHolds(now = new Date()) {
  const expired = await db.booking.findMany({
    where: { status: "PENDING", priceLockedUntil: { lt: now } },
    select: { id: true, slotId: true, people: true, discountedSeats: true },
  });
  for (const b of expired) {
    await db.$transaction(async (tx) => {
      const r = await tx.booking.updateMany({ where: { id: b.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      if (r.count === 1) {
        await tx.slot.update({
          where: { id: b.slotId },
          data: { bookedCount: { decrement: b.people }, discountedSold: { decrement: b.discountedSeats } },
        });
        await tx.reward.updateMany({
          where: { bookingId: b.id, status: "ATTACHED" },
          data: { status: "AVAILABLE", bookingId: null },
        });
      }
    });
  }
}

/** Crée les créneaux manquants sur l'horizon à partir des modèles hebdomadaires. */
export async function topUpSlots(now = new Date(), activityId?: string) {
  const activities = await db.activity.findMany({
    where: activityId ? { id: activityId } : { published: true },
    select: { id: true, weeklyTemplate: true },
  });
  let created = 0;
  for (const a of activities) {
    const template = weeklyTemplateSchema.safeParse(a.weeklyTemplate);
    if (!template.success) continue;
    const wanted = generateSlotTimes(template.data, now, HORIZON_DAYS);
    if (!wanted.length) continue;
    const existing = await db.slot.findMany({
      where: { activityId: a.id, startsAt: { gte: now } },
      select: { startsAt: true },
    });
    const have = new Set(existing.map((s) => s.startsAt.getTime()));
    const missing = wanted.filter((w) => !have.has(w.startsAt.getTime()));
    if (missing.length) {
      await db.slot.createMany({
        data: missing.map((m) => ({ activityId: a.id, startsAt: m.startsAt, capacity: m.capacity })),
      });
      created += missing.length;
    }
  }
  return created;
}

/** À appeler avant de lire des créneaux. Peu coûteux. */
export async function refreshInventory(now = new Date()) {
  await releaseExpiredHolds(now);
  if (now.getTime() - lastTopUp > 10 * 60_000) {
    lastTopUp = now.getTime();
    await topUpSlots(now);
  }
}
