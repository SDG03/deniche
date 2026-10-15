"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function toggleFavorite(activityId: string): Promise<{ needsLogin?: boolean; favorite?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { needsLogin: true };
  if (typeof activityId !== "string" || activityId.length > 40) return {};
  const key = { userId_activityId: { userId: user.id, activityId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) {
    await db.favorite.delete({ where: key });
    return { favorite: false };
  }
  const activity = await db.activity.findUnique({ where: { id: activityId }, select: { id: true } });
  if (!activity) return {};
  await db.favorite.create({ data: { userId: user.id, activityId } });
  return { favorite: true };
}
