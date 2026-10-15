import "server-only";
import { getCurrentUser } from "./auth";
import { db } from "./db";

export async function getFavoriteIds() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  const favs = await db.favorite.findMany({ where: { userId: user.id }, select: { activityId: true } });
  return new Set(favs.map((f) => f.activityId));
}
