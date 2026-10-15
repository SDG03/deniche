import "server-only";
import { getCurrentUser } from "./auth";
import { db } from "./db";

/** Catégories déjà réservées par l'utilisateur connecté. */
export async function getTriedCategories() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  const rows = await db.booking.findMany({
    where: { userId: user.id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    select: { slot: { select: { activity: { select: { category: true } } } } },
  });
  return new Set(rows.map((r) => r.slot.activity.category));
}
