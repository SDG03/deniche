/**
 * Test d'intégration : surréservation impossible, même avec des requêtes simultanées.
 * Utilise une base SQLite jetable (.work/test-concurrency.db).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const file = path.resolve(".work/test-concurrency.db");
const url = `file:${file.replace(/\\/g, "/")}`;
process.env.DATABASE_URL = url;

type Mods = {
  db: typeof import("./db").db;
  booking: typeof import("./booking");
};
let m: Mods;

beforeAll(async () => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const f of [file, `${file}-journal`]) if (fs.existsSync(f)) fs.rmSync(f);
  execSync("npx prisma db push", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  m = { db: (await import("./db")).db, booking: await import("./booking") };
}, 60_000);

afterAll(async () => {
  await m?.db.$disconnect();
});

async function makeSlot(capacity: number, bookedCount = 0) {
  const { db } = m;
  const partner = await db.partner.create({
    data: { slug: `p-${Math.random()}`, name: "Test (démo)", city: "Liège", description: "" },
  });
  const activity = await db.activity.create({
    data: {
      slug: `a-${Math.random()}`,
      partnerId: partner.id,
      category: "karting",
      title: "Test",
      tagline: "",
      description: "",
      images: [],
      imageCredits: [],
      address: "",
      city: "",
      latitude: 50.6,
      longitude: 5.6,
      durationMin: 60,
      minPeople: 1,
      maxPeople: 10,
      basePriceCents: 3000,
      minAge: 0,
      setting: "INDOOR",
      level: "EASY",
      accessibility: "",
      tags: [],
      discountTiers: [{ minHours: 0, pct: 30 }],
      weeklyTemplate: [],
    },
  });
  const slot = await db.slot.create({
    data: { activityId: activity.id, startsAt: new Date(Date.now() + 5 * 3_600_000), capacity, bookedCount },
  });
  const users = await Promise.all(
    Array.from({ length: 10 }, (_, i) => db.user.create({ data: { email: `u${i}-${Math.random()}@test.be`, name: `U${i}` } })),
  );
  return { slot, users };
}

describe("concurrence des réservations", () => {
  it("10 personnes se battent pour les 3 dernières places : 3 gagnent, jamais plus", async () => {
    const { slot, users } = await makeSlot(10, 7);
    const results = await Promise.allSettled(users.map((u) => m.booking.createHold({ userId: u.id, slotId: slot.id, people: 1 })));
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(3);
    const after = await m.db.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.bookedCount).toBe(10);
  }, 30_000);

  it("le quota de places réduites n'est jamais dépassé", async () => {
    const { slot, users } = await makeSlot(10, 0);
    await Promise.allSettled(users.map((u) => m.booking.createHold({ userId: u.id, slotId: slot.id, people: 1 })));
    const after = await m.db.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.discountedSold).toBeLessThanOrEqual(5);
  }, 30_000);

  it("un verrou expiré libère ses places une seule fois", async () => {
    const { slot, users } = await makeSlot(4, 0);
    const hold = await m.booking.createHold({ userId: users[0].id, slotId: slot.id, people: 2 });
    await Promise.all([m.booking.releaseHold(hold.id, "EXPIRED"), m.booking.releaseHold(hold.id, "EXPIRED")]);
    const after = await m.db.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.bookedCount).toBe(0);
  }, 30_000);

  it("refuse de confirmer un paiement après expiration du verrou", async () => {
    const { slot, users } = await makeSlot(4, 0);
    const hold = await m.booking.createHold({ userId: users[0].id, slotId: slot.id, people: 1 });
    const later = new Date(Date.now() + 11 * 60_000);
    await expect(m.booking.confirmBooking(hold.id, { provider: "mock", ref: "x" }, later)).rejects.toThrow();
  }, 30_000);
});
