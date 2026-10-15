"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_PARTNER_EMAIL, DEMO_USER_EMAIL, endSession, safeNext, startSession } from "@/lib/auth";
import { newToken } from "@/lib/codes";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

export async function loginDemo(formData: FormData) {
  const role = formData.get("role") === "partner" ? "partner" : "user";
  const email = role === "partner" ? DEMO_PARTNER_EMAIL : DEMO_USER_EMAIL;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) redirect("/connexion?erreur=seed");
  await startSession(user.id);
  redirect(safeNext(formData.get("next"), role === "partner" ? "/partenaire" : "/"));
}

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  next: z.string().optional(),
});

export async function requestMagicLink(_: unknown, formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { error: "Cet e-mail a l'air bizarre. Vérifie l'orthographe ?" };
  const token = newToken();
  await db.loginToken.create({
    data: { token, email: parsed.data.email, expiresAt: new Date(Date.now() + 15 * 60_000) },
  });
  const next = safeNext(parsed.data.next);
  const link = `/connexion/verifier?token=${token}&next=${encodeURIComponent(next)}`;
  await sendMail({
    to: parsed.data.email,
    subject: "Ton lien de connexion Déniche",
    body: `Clique ici pour te connecter (valable 15 minutes) : ${link}`,
  });
  redirect(`/connexion/envoye?email=${encodeURIComponent(parsed.data.email)}&lien=${encodeURIComponent(link)}`);
}

export async function logout() {
  await endSession();
  redirect("/");
}
