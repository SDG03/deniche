/**
 * `npm run seed` — remet la base à zéro et génère la démo :
 * 5 partenaires fictifs, 18 activités, créneaux sur 14 jours passés + 21 jours à venir,
 * réservations simulées (taux de remplissage variés) et comptes démo.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { computePrice, DEFAULT_TIERS, PRICING_DEFAULTS, quoteBooking } from "../src/lib/pricing";
import { generateSlotTimes } from "../src/lib/schedule";
import { newBookingReference, newCheckinCode } from "../src/lib/codes";
import { ACTIVITIES, PARTNERS, REVIEW_SNIPPETS } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

// Générateur pseudo-aléatoire déterministe : la démo est la même à chaque seed.
let state = 20261015;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

const H = 3_600_000;
const FUTURE_DAYS = 21;
const PAST_DAYS = 14;
const FIRST_NAMES = ["Lucie", "Thomas", "Inès", "Julien", "Sarah", "Maxime", "Nora", "Hugo", "Emma", "Arthur", "Léa", "Noah"];

function imagesFor(slug: string, category: string) {
  const credits: Record<string, { file: string; author: string; license: string; source: string }[]> = (() => {
    const p = path.join(__dirname, "image-credits.json");
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  })();
  const dir = path.join(__dirname, "..", "public", "images", "activities");
  const photos = (credits[slug] ?? []).filter((c) => fs.existsSync(path.join(dir, c.file)));
  if (photos.length >= 3) {
    return {
      images: photos.map((c) => `/images/activities/${c.file}`),
      imageCredits: photos.map(({ author, license, source }) => ({ author, license, source })),
    };
  }
  // Repli hors-ligne : couvertures SVG générées par catégorie.
  const covers = [1, 2, 3].map((n) => `/images/covers/${category}-${n}.svg`);
  return {
    images: covers,
    imageCredits: covers.map(() => ({ author: "Illustration Déniche", license: "Interne", source: "" })),
  };
}

async function main() {
  const now = new Date();
  console.log("Remise à zéro de la base…");
  await db.booking.deleteMany();
  await db.favorite.deleteMany();
  await db.review.deleteMany();
  await db.slot.deleteMany();
  await db.activity.deleteMany();
  await db.session.deleteMany();
  await db.loginToken.deleteMany();
  await db.user.deleteMany();
  await db.partner.deleteMany();

  const partners = new Map<string, string>();
  for (const p of PARTNERS) {
    const created = await db.partner.create({ data: p });
    partners.set(p.slug, created.id);
  }

  const demoUser = await db.user.create({
    data: { email: "camille@demo.deniche.be", name: "Camille (démo)", role: "USER" },
  });
  await db.user.create({
    data: {
      email: "partenaire@demo.deniche.be",
      name: "Alex (démo)",
      role: "PARTNER",
      partnerId: partners.get("ourthe-ambleve"),
    },
  });
  const customers = await Promise.all(
    FIRST_NAMES.map((name, i) =>
      db.user.create({ data: { email: `client${i + 1}@demo.deniche.be`, name: `${name} (démo)` } }),
    ),
  );

  let slotCount = 0;
  let bookingCount = 0;

  for (const a of ACTIVITIES) {
    const { images, imageCredits } = imagesFor(a.slug, a.category);
    const activity = await db.activity.create({
      data: {
        slug: a.slug,
        partnerId: partners.get(a.partner)!,
        category: a.category,
        title: a.title,
        tagline: a.tagline,
        description: a.description,
        images,
        imageCredits,
        address: a.address,
        city: a.city,
        latitude: a.latitude,
        longitude: a.longitude,
        durationMin: a.durationMin,
        minPeople: a.minPeople,
        maxPeople: a.maxPeople,
        basePriceCents: a.basePrice * 100,
        minAge: a.minAge,
        setting: a.setting,
        level: a.level,
        accessibility: a.accessibility,
        tags: a.tags,
        cancellationPolicy: a.cancellationPolicy,
        lastMinuteEnabled: a.lastMinuteEnabled ?? true,
        discountTiers: DEFAULT_TIERS,
        floorPct: a.floorPct ?? PRICING_DEFAULTS.floorPct,
        weeklyTemplate: a.weekly,
      },
    });

    // Avis de maquette
    const reviewCount = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < reviewCount; i++) {
      const r = REVIEW_SNIPPETS[(i + a.slug.length) % REVIEW_SNIPPETS.length];
      await db.review.create({
        data: {
          activityId: activity.id,
          authorName: r.author,
          rating: r.rating,
          comment: r.comment,
          createdAt: new Date(now.getTime() - (i + 1) * 9 * 24 * H),
        },
      });
    }

    const past = generateSlotTimes(a.weekly, new Date(now.getTime() - PAST_DAYS * 24 * H), PAST_DAYS).filter(
      (s) => s.startsAt < now,
    );
    const future = generateSlotTimes(a.weekly, now, FUTURE_DAYS);

    for (const s of [...past, ...future]) {
      const isPast = s.startsAt < now;
      const hoursAhead = (s.startsAt.getTime() - now.getTime()) / H;
      // Remplissage cible : popularité + bruit, plus fort le week-end et à l'approche.
      const weekend = [0, 6].includes(s.startsAt.getUTCDay());
      const proximity = isPast ? 1 : Math.max(0.15, 1 - hoursAhead / (FUTURE_DAYS * 24));
      let target = a.popularity * proximity * (weekend ? 1.15 : 0.85) + (rand() - 0.5) * 0.5;
      if (rand() < 0.12) target = 0; // quelques créneaux vides (bonus de remplissage)
      if (rand() < 0.08) target = 1; // quelques créneaux complets
      target = Math.min(1, Math.max(0, target));
      const seats = Math.round(s.capacity * target);

      const slot = await db.slot.create({
        data: { activityId: activity.id, startsAt: s.startsAt, capacity: s.capacity },
      });
      slotCount++;

      let booked = 0;
      let discountedSold = 0;
      const rows = [];
      while (booked < seats) {
        const people = Math.min(seats - booked, Math.max(a.minPeople, 1 + Math.floor(rand() * 4)));
        // Moment de la réservation : entre 5 jours et 40 min avant, toujours dans le passé.
        const leadH = rand() < 0.35 ? 0.7 + rand() * 6 : 6 + rand() * 114;
        const bookedAt = new Date(Math.min(now.getTime() - 60_000, s.startsAt.getTime() - leadH * H));
        const price = computePrice({
          basePriceCents: activity.basePriceCents,
          startsAt: s.startsAt,
          now: bookedAt,
          fillRate: booked / s.capacity,
          quota: { capacity: s.capacity, discountedSold },
        });
        const q = quoteBooking(price, people);
        const cancelled = rand() < 0.05;
        const status = cancelled ? "CANCELLED" : isPast ? (rand() < 0.85 ? "CHECKED_IN" : "CONFIRMED") : "CONFIRMED";
        const customer = pick(customers);
        rows.push({
          reference: newBookingReference(),
          userId: customer.id,
          slotId: slot.id,
          people,
          participantNames: Array.from({ length: people }, (_, i) =>
            i === 0 ? customer.name : `${pick(FIRST_NAMES)} (démo)`,
          ),
          baseUnitPriceCents: activity.basePriceCents,
          unitPriceCents: q.unitPriceCents,
          discountPct: q.discountedSeats > 0 ? price.discountPct : 0,
          discountedSeats: q.discountedSeats,
          totalCents: q.totalCents,
          status: status as "CANCELLED" | "CHECKED_IN" | "CONFIRMED",
          priceLockedUntil: new Date(bookedAt.getTime() + 10 * 60_000),
          paymentProvider: "mock",
          paymentRef: `mock_${newCheckinCode().toLowerCase()}`,
          checkinCode: newCheckinCode(),
          createdAt: bookedAt,
          confirmedAt: bookedAt,
          cancelledAt: cancelled ? new Date(bookedAt.getTime() + 2 * H) : null,
          checkedInAt: status === "CHECKED_IN" ? s.startsAt : null,
        });
        // Une réservation annulée ne garde pas ses places.
        if (!cancelled) {
          booked += people;
          discountedSold += q.discountedSeats;
        }
      }
      if (rows.length) {
        await db.booking.createMany({ data: rows });
        bookingCount += rows.length;
      }
      await db.slot.update({ where: { id: slot.id }, data: { bookedCount: booked, discountedSold } });
    }
  }

  // Réservations de Camille : une à venir, deux passées.
  const pickSlot = async (slug: string, when: "past" | "future") => {
    const activity = await db.activity.findUniqueOrThrow({ where: { slug } });
    const slots = await db.slot.findMany({
      where: {
        activityId: activity.id,
        startsAt: when === "future" ? { gt: new Date(now.getTime() + 48 * H) } : { lt: now },
      },
      orderBy: { startsAt: when === "future" ? "asc" : "desc" },
    });
    const slot = slots.find((s) => s.capacity - s.bookedCount >= 2) ?? slots[0];
    return { activity, slot };
  };
  const demoBookings = [
    { slug: "kayak-ourthe-durbuy", when: "future" as const, people: 2 },
    { slug: "bloc-grivegnee", when: "past" as const, people: 1 },
    { slug: "gaufres-liege", when: "past" as const, people: 2 },
  ];
  for (const b of demoBookings) {
    const { activity, slot } = await pickSlot(b.slug, b.when);
    if (!slot) continue;
    const bookedAt = new Date(Math.min(now.getTime() - H, slot.startsAt.getTime() - 30 * H));
    const price = computePrice({
      basePriceCents: activity.basePriceCents,
      startsAt: slot.startsAt,
      now: bookedAt,
      fillRate: slot.bookedCount / slot.capacity,
    });
    const q = quoteBooking(price, b.people);
    await db.booking.create({
      data: {
        reference: newBookingReference(),
        userId: demoUser.id,
        slotId: slot.id,
        people: b.people,
        participantNames: ["Camille (démo)", "Sam (démo)"].slice(0, b.people),
        baseUnitPriceCents: activity.basePriceCents,
        unitPriceCents: q.unitPriceCents,
        discountPct: price.discountPct,
        discountedSeats: q.discountedSeats,
        totalCents: q.totalCents,
        status: b.when === "past" ? "CHECKED_IN" : "CONFIRMED",
        priceLockedUntil: new Date(bookedAt.getTime() + 10 * 60_000),
        paymentProvider: "mock",
        paymentRef: "mock_demo",
        checkinCode: newCheckinCode(),
        createdAt: bookedAt,
        confirmedAt: bookedAt,
        checkedInAt: b.when === "past" ? slot.startsAt : null,
      },
    });
    await db.slot.update({
      where: { id: slot.id },
      data: { bookedCount: { increment: b.people }, discountedSold: { increment: q.discountedSeats } },
    });
  }
  for (const slug of ["alpagas-verviers", "ceramique-verviers"]) {
    const activity = await db.activity.findUniqueOrThrow({ where: { slug } });
    await db.favorite.create({ data: { userId: demoUser.id, activityId: activity.id } });
  }

  console.log(
    `OK : ${PARTNERS.length} partenaires, ${ACTIVITIES.length} activités, ${slotCount} créneaux, ${bookingCount} réservations simulées.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
