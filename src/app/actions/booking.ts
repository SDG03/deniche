"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { BookingError, canCancel, confirmBooking, createHold, getBookingForUser, releaseHold } from "@/lib/booking";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { formatPrice, formatSlotWhen } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { getPaymentProvider } from "@/lib/payments";
import { attachReward, firstAvailableReward, releaseReward as releaseRewardFor } from "@/lib/rewards";

export type CheckoutState = { error?: string };

const ERRORS: Record<string, string> = {
  sold_out: copy.booking.soldOut,
  closed: copy.booking.closedNow,
  race: copy.errors.race,
  people: copy.errors.people,
  not_found: copy.errors.slotGone,
  expired: copy.booking.lockExpired,
};

const startSchema = z.object({
  slotId: z.string().min(1).max(40),
  people: z.coerce.number().int().min(1).max(50),
  slug: z.string().max(80),
});

/** Clic 2 : « Réserver » → prix recalculé, places bloquées, prix verrouillé 10 min. */
export async function startCheckout(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: copy.errors.pickSlot };
  const { slotId, people, slug } = parsed.data;
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/activite/${slug}?creneau=${slotId}`)}&raison=reserver`);

  let bookingId: string;
  try {
    const booking = await createHold({ userId: user.id, slotId, people });
    bookingId = booking.id;
  } catch (e) {
    if (e instanceof BookingError) return { error: ERRORS[e.code] ?? copy.states.error };
    throw e;
  }
  redirect(`/reserver/${bookingId}`);
}

const payerSchema = z.object({
  bookingId: z.string().min(1).max(40),
  method: z.enum(["card", "bancontact"]),
  cardNumber: z.string().max(30).optional(),
  names: z.array(z.string().trim().min(1, copy.errors.missingName).max(40)),
});

export type PayState = { error?: string };

/** Clic 3 : « Payer ». Le montant vient de la réservation verrouillée, jamais du client. */
export async function payBooking(_: PayState, formData: FormData): Promise<PayState> {
  const user = await requireUser();
  const parsed = payerSchema.safeParse({
    bookingId: formData.get("bookingId"),
    method: formData.get("method") ?? "card",
    cardNumber: formData.get("cardNumber") ?? undefined,
    names: formData.getAll("names").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? copy.errors.incompleteForm };
  const { bookingId, method, cardNumber, names } = parsed.data;

  const booking = await getBookingForUser(bookingId, user.id);
  if (!booking) return { error: copy.errors.bookingNotFound };
  if (booking.status === "CONFIRMED") redirect(`/reservation/${booking.id}`);
  if (booking.status !== "PENDING" || booking.priceLockedUntil < new Date()) {
    if (booking.status === "PENDING") await releaseHold(booking.id, "EXPIRED");
    return { error: copy.booking.lockExpired };
  }
  if (names.length !== booking.people) return { error: copy.errors.namePerParticipant };

  await db.booking.update({ where: { id: booking.id }, data: { participantNames: names } });

  // Cadeau fidélité : rattaché avant le paiement, libéré automatiquement si la réservation n'aboutit pas.
  if (formData.get("useReward") === "on") {
    const reward = await firstAvailableReward(user.id);
    if (reward) await attachReward(reward.id, user.id, booking.id);
  }

  const provider = getPaymentProvider();
  const h = await headers();
  const baseUrl = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const result = await provider.startPayment(
    {
      id: booking.id,
      reference: booking.reference,
      totalCents: booking.totalCents,
      description: `${booking.slot.activity.title} — ${booking.people} pers. — ${formatSlotWhen(booking.slot.startsAt)}`,
      customerEmail: user.email,
    },
    { method, cardNumber, baseUrl },
  );

  if (result.status === "declined") {
    await releaseRewardFor(booking.id);
    return { error: result.message };
  }
  if (result.status === "redirect") {
    // Le client est chez Stripe : on prolonge le blocage jusqu'à l'expiration de la session Stripe (31 min).
    await db.booking.update({
      where: { id: booking.id },
      data: {
        paymentProvider: provider.id,
        paymentRef: result.ref,
        priceLockedUntil: new Date(Date.now() + 31 * 60_000),
      },
    });
    redirect(result.url);
  }

  try {
    await confirmBooking(booking.id, { provider: provider.id, ref: result.ref });
  } catch (e) {
    if (e instanceof BookingError) {
      await provider.refund(result.ref, booking.totalCents);
      await releaseRewardFor(booking.id);
      return { error: copy.booking.lockExpired };
    }
    throw e;
  }
  await sendMail({
    to: user.email,
    subject: `C'est réservé : ${booking.slot.activity.title}`,
    body: `Référence ${booking.reference} · code d'arrivée ${booking.checkinCode}\n${formatSlotWhen(booking.slot.startsAt)} · ${booking.people} pers. · ${formatPrice(booking.totalCents)}\n${booking.slot.activity.address}`,
  });
  redirect(`/reservation/${booking.id}?nouveau=1`);
}

/** Abandon volontaire du checkout : on rend les places tout de suite. */
export async function abandonCheckout(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("bookingId") ?? "");
  const booking = await getBookingForUser(id, user.id);
  if (booking?.status === "PENDING") await releaseHold(booking.id, "EXPIRED");
  redirect(booking ? `/activite/${booking.slot.activity.slug}` : "/");
}

/** Annulation par l'utilisateur, selon la politique du partenaire. */
export async function cancelBooking(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("bookingId") ?? "");
  const booking = await getBookingForUser(id, user.id);
  if (!booking || booking.status !== "CONFIRMED") return;
  if (!canCancel(booking.slot.activity.cancellationPolicy, booking.slot.startsAt)) return;
  const ok = await releaseHold(booking.id, "CANCELLED", ["CONFIRMED"]);
  if (ok && booking.paymentRef) {
    await getPaymentProvider().refund(booking.paymentRef, booking.totalCents);
    await sendMail({
      to: user.email,
      subject: `Réservation annulée : ${booking.slot.activity.title}`,
      body: `Référence ${booking.reference}. Remboursement de ${formatPrice(booking.totalCents)} (simulé).`,
    });
  }
  revalidatePath("/reservations");
}
