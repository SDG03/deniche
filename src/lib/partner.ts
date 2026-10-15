import "server-only";
import { db } from "./db";

const DAY = 86_400_000;

export type PartnerStats = {
  fillRate: number;
  revenueCents: number;
  lastMinuteShare: number;
  bookings: number;
  seats: number;
  savedCents: number;
  perActivity: { id: string; title: string; fillRate: number; revenueCents: number; seats: number }[];
  daily: { day: string; revenueCents: number; seats: number }[];
};

/**
 * Statistiques sur les créneaux des `days` derniers jours (déjà passés) :
 * - remplissage = places vendues / capacité
 * - CA = réservations confirmées ou validées
 * - dernière minute = réservations faites moins de 24 h avant le départ
 */
export async function getPartnerStats(partnerId: string, now = new Date(), days = 30): Promise<PartnerStats> {
  const from = new Date(now.getTime() - days * DAY);
  const slots = await db.slot.findMany({
    where: { activity: { partnerId }, startsAt: { gte: from, lt: now } },
    include: {
      activity: { select: { id: true, title: true } },
      bookings: { where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } } },
    },
  });

  let capacity = 0;
  let seats = 0;
  let revenue = 0;
  let saved = 0;
  let count = 0;
  let lastMinute = 0;
  const per = new Map<string, { id: string; title: string; capacity: number; seats: number; revenueCents: number }>();
  const daily = new Map<string, { revenueCents: number; seats: number }>();

  for (const s of slots) {
    const sold = s.bookings.reduce((t, b) => t + b.people, 0);
    const rev = s.bookings.reduce((t, b) => t + b.totalCents, 0);
    capacity += s.capacity;
    seats += sold;
    revenue += rev;
    for (const b of s.bookings) {
      count++;
      saved += b.baseUnitPriceCents * b.people - b.totalCents;
      if (s.startsAt.getTime() - b.createdAt.getTime() < DAY) lastMinute++;
    }
    const p = per.get(s.activity.id) ?? {
      id: s.activity.id,
      title: s.activity.title,
      capacity: 0,
      seats: 0,
      revenueCents: 0,
    };
    p.capacity += s.capacity;
    p.seats += sold;
    p.revenueCents += rev;
    per.set(s.activity.id, p);
    const key = s.startsAt.toISOString().slice(0, 10);
    const d = daily.get(key) ?? { revenueCents: 0, seats: 0 };
    d.revenueCents += rev;
    d.seats += sold;
    daily.set(key, d);
  }

  return {
    fillRate: capacity ? seats / capacity : 0,
    revenueCents: revenue,
    lastMinuteShare: count ? lastMinute / count : 0,
    bookings: count,
    seats,
    savedCents: saved,
    perActivity: [...per.values()]
      .map((p) => ({
        id: p.id,
        title: p.title,
        fillRate: p.capacity ? p.seats / p.capacity : 0,
        revenueCents: p.revenueCents,
        seats: p.seats,
      }))
      .sort((a, b) => b.fillRate - a.fillRate),
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
  };
}

export async function getPartnerActivity(partnerId: string, id: string) {
  const a = await db.activity.findUnique({ where: { id } });
  return a && a.partnerId === partnerId ? a : null;
}

export async function getPartnerBookings(
  partnerId: string,
  opts: { from?: Date; to?: Date; take?: number; orderBy?: "created" | "slot"; excludeCancelled?: boolean } = {},
) {
  return db.booking.findMany({
    where: {
      slot: { activity: { partnerId }, startsAt: { gte: opts.from, lt: opts.to } },
      status: { in: opts.excludeCancelled ? ["CONFIRMED", "CHECKED_IN"] : ["CONFIRMED", "CHECKED_IN", "CANCELLED"] },
    },
    include: {
      user: { select: { name: true } },
      slot: { include: { activity: { select: { title: true, slug: true } } } },
    },
    orderBy: opts.orderBy === "slot" ? { slot: { startsAt: "asc" } } : { createdAt: "desc" },
    take: opts.take ?? 100,
  });
}
