import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { newToken } from "./codes";

export const SESSION_COOKIE = "deniche_session";
const SESSION_DAYS = 30;
export const DEMO_USER_EMAIL = "camille@demo.deniche.be";
export const DEMO_PARTNER_EMAIL = "partenaire@demo.deniche.be";

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requirePartner() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/partenaire");
  if (user.role !== "PARTNER" || !user.partnerId) redirect("/connexion?partenaire=1");
  return { user, partnerId: user.partnerId };
}

/** À appeler depuis une Server Action ou un Route Handler (écriture de cookie). */
export async function startSession(userId: string) {
  const id = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: token } });
  jar.delete(SESSION_COOKIE);
}

export function safeNext(next: unknown, fallback = "/") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
