import "server-only";
import { addHours } from "date-fns";
import { priceSlot } from "./activity-pricing";
import { newBookingReference, newCheckinCode } from "./codes";
import { db } from "./db";
import { PRICING_DEFAULTS, quoteBooking } from "./pricing";

export type BookingErrorCode = "not_found" | "closed" | "sold_out" | "people" | "race" | "expired" | "forbidden";

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const LOCK_MS = PRICING_DEFAULTS.lockMinutes * 60_000;

/**
 * Étape 1 du checkout : le serveur RECALCULE le prix, bloque les places et
 * verrouille le prix 10 minutes. La mise à jour conditionnelle du créneau
 * (bookedCount ≤ capacité − personnes) est atomique : deux clients ne peuvent
 * pas obtenir la dernière place en même temps.
 */
export async function createHold({
  userId,
  slotId,
  people,
  now = new Date(),
}: {
  userId: string;
  slotId: string;
  people: number;
  now?: Date;
}) {
  // Un seul checkout en cours par personne et par créneau : on libère l'ancien.
  const previous = await db.booking.findMany({ where: { userId, slotId, status: "PENDING" } });
  for (const p of previous) await releaseHold(p.id, "EXPIRED");

  return db.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({ where: { id: slotId }, include: { activity: true } });
    if (!slot || !slot.activity.published) throw new BookingError("not_found");
    const a = slot.activity;
    if (!Number.isInteger(people) || people < a.minPeople || people > a.maxPeople) throw new BookingError("people");

    const price = priceSlot(a, slot, now);
    if (!price.isBookable) throw new BookingError("closed");
    if (slot.capacity - slot.bookedCount < people) throw new BookingError("sold_out");

    const quote = quoteBooking(price, people);
    const quotaMax = Math.floor((slot.capacity * a.quotaPct) / 100);

    const updated = await tx.slot.updateMany({
      where: {
        id: slot.id,
        capacity: slot.capacity,
        bookedCount: { lte: slot.capacity - people },
        discountedSold: { lte: quotaMax - quote.discountedSeats },
      },
      data: {
        bookedCount: { increment: people },
        discountedSold: { increment: quote.discountedSeats },
      },
    });
    if (updated.count !== 1) {
      const fresh = await tx.slot.findUniqueOrThrow({ where: { id: slot.id } });
      throw new BookingError(fresh.capacity - fresh.bookedCount < people ? "sold_out" : "race");
    }

    return tx.booking.create({
      data: {
        reference: newBookingReference(),
        userId,
        slotId: slot.id,
        people,
        participantNames: [],
        baseUnitPriceCents: a.basePriceCents,
        unitPriceCents: quote.unitPriceCents,
        discountPct: quote.discountedSeats > 0 ? price.discountPct : 0,
        discountedSeats: quote.discountedSeats,
        totalCents: quote.totalCents,
        status: "PENDING",
        priceLockedUntil: new Date(now.getTime() + LOCK_MS),
        checkinCode: newCheckinCode(),
      },
    });
  });
}

/** Libère les places d'une réservation (une seule fois grâce au statut conditionnel). */
export async function releaseHold(
  bookingId: string,
  status: "EXPIRED" | "CANCELLED",
  from: ("PENDING" | "CONFIRMED")[] = ["PENDING"],
) {
  return db.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!b) return false;
    const r = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: from } },
      data: { status, cancelledAt: status === "CANCELLED" ? new Date() : undefined },
    });
    if (r.count !== 1) return false;
    await tx.slot.update({
      where: { id: b.slotId },
      data: { bookedCount: { decrement: b.people }, discountedSold: { decrement: b.discountedSeats } },
    });
    // Un cadeau fidélité rattaché redevient disponible.
    await tx.reward.updateMany({
      where: { bookingId, status: "ATTACHED" },
      data: { status: "AVAILABLE", bookingId: null },
    });
    return true;
  });
}

/** Paiement accepté : on confirme, si le verrou n'a pas expiré. */
export async function confirmBooking(
  bookingId: string,
  payment: { provider: string; ref: string },
  now = new Date(),
  { ignoreLock = false } = {},
) {
  const r = await db.booking.updateMany({
    where: { id: bookingId, status: "PENDING", ...(ignoreLock ? {} : { priceLockedUntil: { gte: now } }) },
    data: { status: "CONFIRMED", confirmedAt: now, paymentProvider: payment.provider, paymentRef: payment.ref },
  });
  if (r.count !== 1) {
    const b = await db.booking.findUnique({ where: { id: bookingId } });
    if (b?.status === "CONFIRMED") return b; // idempotent (retour Stripe rejoué)
    throw new BookingError("expired");
  }
  return db.booking.findUniqueOrThrow({ where: { id: bookingId } });
}

export const CANCEL_HOURS = { FLEXIBLE: 24, MODERATE: 72, STRICT: null } as const;

export function cancellationDeadline(policy: keyof typeof CANCEL_HOURS, startsAt: Date) {
  const h = CANCEL_HOURS[policy];
  return h === null ? null : addHours(startsAt, -h);
}

export function canCancel(policy: keyof typeof CANCEL_HOURS, startsAt: Date, now = new Date()) {
  const deadline = cancellationDeadline(policy, startsAt);
  return deadline !== null && now < deadline;
}

export async function getBookingForUser(bookingId: string, userId: string) {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { activity: { include: { partner: true } } } }, reward: true },
  });
  if (!b || b.userId !== userId) return null;
  return b;
}
