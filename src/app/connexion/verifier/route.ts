import type { NextRequest } from "next/server";
import { safeNext, startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

/** Lien magique : consomme le jeton, crée le compte au besoin, ouvre la session. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const now = new Date();

  const consumed = await db.loginToken.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (consumed.count !== 1) {
    return redirectTo("/connexion?erreur=lien");
  }
  const { email } = await db.loginToken.findUniqueOrThrow({ where: { token } });
  const name = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
  const user = await db.user.upsert({ where: { email }, update: {}, create: { email, name } });
  await startSession(user.id);
  return redirectTo(next);
}
