import { describe, expect, it } from "vitest";
import {
  applyDiscount,
  computePrice,
  DEFAULT_TIERS,
  discountedSeatsLeft,
  priceCurve,
  quoteBooking,
} from "./pricing";

const H = 3_600_000;
const startsAt = new Date("2026-11-14T14:00:00Z");
const at = (hoursBefore: number) => new Date(startsAt.getTime() - hoursBefore * H);
// Remplissage « normal » (entre 40 et 80 %) pour isoler les paliers du bonus.
const base = { basePriceCents: 3000, startsAt, fillRate: 0.5 };

describe("paliers de réduction — bornes exactes", () => {
  it.each([
    [100, 0],
    [72, 0],
    [72 - 1 / 3600, 10],
    [24, 10],
    [24 - 1 / 3600, 20],
    [6, 20],
    [6 - 1 / 3600, 30],
    [2, 30],
    [2 - 1 / 3600, 40],
    [0.6, 40],
  ])("à %f h du départ → −%i %%", (hours, pct) => {
    expect(computePrice({ ...base, now: at(hours) }).discountPct).toBe(pct);
  });

  it("calcule le prix de chaque palier sur une base de 30 €", () => {
    const prices = [80, 48, 12, 4, 1].map((h) => computePrice({ ...base, now: at(h) }).unitPriceCents);
    expect(prices).toEqual([3000, 2700, 2400, 2100, 1800]);
  });

  it("n'applique aucune réduction si la dernière minute est désactivée", () => {
    const r = computePrice({ ...base, now: at(1), lastMinuteEnabled: false });
    expect(r.discountPct).toBe(0);
    expect(r.unitPriceCents).toBe(3000);
    expect(r.nextChangeAt).toBeNull();
  });

  it("accepte des paliers personnalisés non triés", () => {
    const tiers = [
      { minHours: 0, pct: 25 },
      { minHours: 48, pct: 0 },
    ];
    expect(computePrice({ ...base, now: at(50), tiers }).discountPct).toBe(0);
    expect(computePrice({ ...base, now: at(47), tiers }).discountPct).toBe(25);
  });
});

describe("plancher", () => {
  it("ne descend jamais sous floorPct du prix de base", () => {
    const tiers = [{ minHours: 0, pct: 90 }];
    const r = computePrice({ ...base, now: at(10), tiers, floorPct: 50 });
    expect(r.discountPct).toBe(50);
    expect(r.unitPriceCents).toBe(1500);
  });

  it("un plancher à 70 % limite la réduction à 30 points", () => {
    const r = computePrice({ ...base, now: at(1), floorPct: 70 });
    expect(r.discountPct).toBe(30);
    expect(r.unitPriceCents).toBe(2100);
  });

  it("l'arrondi ne fait jamais passer sous le plancher", () => {
    // 12,30 € × 50 % = 6,15 € → arrondi à 6,00 € serait sous le plancher → 6,50 €
    expect(applyDiscount(1230, 50, 50)).toBe(650);
  });
});

describe("arrondi au 0,50 €", () => {
  it.each([
    [1990, 10, 1800], // 17,91 → 18,00
    [2250, 20, 1800], // 18,00 → 18,00
    [3290, 30, 2300], // 23,03 → 23,00
    [3290, 40, 1950], // 19,74 → 19,50
    [1725, 10, 1550], // 15,525 → 15,50
    [1275, 20, 1000], // 10,20 → 10,00
  ])("%i c − %i %% → %i c", (cents, pct, expected) => {
    expect(applyDiscount(cents, pct, 50)).toBe(expected);
  });

  it("ne touche pas au prix quand il n'y a pas de réduction", () => {
    expect(applyDiscount(1990, 0, 50)).toBe(1990);
  });

  it("renvoie toujours un multiple de 50 c en cas de réduction", () => {
    for (let cents = 1200; cents <= 6500; cents += 37) {
      for (const pct of [10, 20, 30, 40, 50]) {
        expect(applyDiscount(cents, pct, 50) % 50).toBe(0);
      }
    }
  });
});

describe("remplissage", () => {
  it("ajoute 10 points sous 40 % de remplissage à moins de 24 h", () => {
    const r = computePrice({ ...base, fillRate: 0.2, now: at(12) });
    expect(r.discountPct).toBe(30);
    expect(r.fillBonusApplied).toBe(true);
  });

  it("pas de bonus à plus de 24 h, même si le créneau est vide", () => {
    expect(computePrice({ ...base, fillRate: 0, now: at(30) }).discountPct).toBe(10);
  });

  it("pas de bonus à 40 % pile", () => {
    expect(computePrice({ ...base, fillRate: 0.4, now: at(12) }).discountPct).toBe(20);
  });

  it("le bonus reste plafonné par le plancher", () => {
    const r = computePrice({ ...base, fillRate: 0.1, now: at(1) });
    expect(r.discountPct).toBe(50);
    expect(r.unitPriceCents).toBe(1500);
  });

  it("aucune réduction au-delà de 80 % de remplissage", () => {
    const r = computePrice({ ...base, fillRate: 0.85, now: at(1) });
    expect(r.discountPct).toBe(0);
    expect(r.unitPriceCents).toBe(3000);
  });

  it("explique l'absence de réduction", () => {
    expect(computePrice({ ...base, fillRate: 0.9, now: at(1) }).tierLabel).toMatch(/Presque complet/);
    expect(computePrice({ ...base, now: at(1), quota: { capacity: 4, discountedSold: 2 } }).tierLabel).toMatch(/prix réduit/);
    expect(computePrice({ ...base, now: at(100) }).tierLabel).toBe("Plein tarif");
  });

  it("à 80 % pile, la réduction s'applique encore", () => {
    expect(computePrice({ ...base, fillRate: 0.8, now: at(1) }).discountPct).toBe(40);
  });
});

describe("quota de places réduites", () => {
  it("50 % d'une capacité de 12 → 6 places réduites", () => {
    expect(discountedSeatsLeft({ capacity: 12, discountedSold: 0 })).toBe(6);
    expect(discountedSeatsLeft({ capacity: 12, discountedSold: 4 })).toBe(2);
    expect(discountedSeatsLeft({ capacity: 7, discountedSold: 0 })).toBe(3);
  });

  it("supprime la réduction quand le quota est atteint", () => {
    const r = computePrice({ ...base, now: at(4), quota: { capacity: 10, discountedSold: 5 } });
    expect(r.quotaReached).toBe(true);
    expect(r.discountPct).toBe(0);
    expect(r.unitPriceCents).toBe(3000);
  });

  it("ne réduit que les places restantes du quota pour un groupe", () => {
    const price = computePrice({ ...base, now: at(4), quota: { capacity: 10, discountedSold: 3 } });
    expect(price.discountPct).toBe(30);
    const q = quoteBooking(price, 4);
    expect(q.discountedSeats).toBe(2);
    expect(q.fullPriceSeats).toBe(2);
    expect(q.totalCents).toBe(2 * 2100 + 2 * 3000);
  });

  it("au plein tarif, aucune place n'est comptée dans le quota", () => {
    const price = computePrice({ ...base, now: at(100), quota: { capacity: 10, discountedSold: 0 } });
    expect(quoteBooking(price, 3)).toMatchObject({ discountedSeats: 0, totalCents: 9000 });
  });
});

describe("fermeture des réservations", () => {
  it("ferme 30 min avant le début par défaut", () => {
    expect(computePrice({ ...base, now: at(0.51) }).isBookable).toBe(true);
    expect(computePrice({ ...base, now: at(0.5) }).isBookable).toBe(false);
    expect(computePrice({ ...base, now: at(-1) }).isBookable).toBe(false);
  });

  it("le délai de fermeture est paramétrable", () => {
    expect(computePrice({ ...base, now: at(1.5), cutoffMinutes: 120 }).isBookable).toBe(false);
  });
});

describe("prochain palier", () => {
  it("annonce le passage à −30 % à 6 h du départ", () => {
    const r = computePrice({ ...base, now: at(8) });
    expect(r.discountPct).toBe(20);
    expect(r.nextDiscountPct).toBe(30);
    expect(r.nextChangeAt?.toISOString()).toBe(at(6).toISOString());
  });

  it("annonce le bonus de remplissage dès le passage sous 24 h", () => {
    const r = computePrice({ ...base, fillRate: 0.1, now: at(30) });
    expect(r.nextChangeAt?.toISOString()).toBe(at(24).toISOString());
    expect(r.nextDiscountPct).toBe(30);
  });

  it("ne propose rien quand on est déjà au dernier palier", () => {
    expect(computePrice({ ...base, now: at(1) }).nextChangeAt).toBeNull();
  });

  it("ignore un palier qui tomberait après la fermeture", () => {
    const r = computePrice({ ...base, now: at(3), cutoffMinutes: 150 });
    expect(r.nextChangeAt).toBeNull();
  });

  it("saute un seuil qui ne change pas la réduction (plancher atteint)", () => {
    const r = computePrice({ ...base, now: at(10), floorPct: 80 });
    expect(r.discountPct).toBe(20);
    expect(r.nextChangeAt).toBeNull();
  });
});

describe("changement d'heure du 25 octobre 2026 (Europe/Brussels)", () => {
  // Le 25/10/2026 à 03:00 heure d'été, on recule à 02:00 : la journée dure 25 h.
  const dstSlot = new Date("2026-10-25T11:00:00Z"); // 12:00 heure d'hiver (UTC+1)
  const dstBase = { basePriceCents: 4000, startsAt: dstSlot, fillRate: 0.5 };

  it("la veille à 12:00 locale il reste 25 h réelles, donc toujours −10 %", () => {
    const now = new Date("2026-10-24T10:00:00Z"); // 12:00 heure d'été (UTC+2)
    const r = computePrice({ ...dstBase, now });
    expect(r.hoursLeft).toBe(25);
    expect(r.discountPct).toBe(10);
  });

  it("le passage à −20 % tombe à 13:00 locale la veille, pas à 12:00", () => {
    const now = new Date("2026-10-24T06:00:00Z");
    const r = computePrice({ ...dstBase, now });
    expect(r.nextChangeAt?.toISOString()).toBe("2026-10-24T11:00:00.000Z");
    const local = new Intl.DateTimeFormat("fr-BE", {
      timeZone: "Europe/Brussels",
      hour: "2-digit",
      minute: "2-digit",
    }).format(r.nextChangeAt!);
    expect(local).toBe("13:00");
  });

  it("créneau à 02:30 (heure répétée) : paliers comptés en heures réelles", () => {
    const slot = new Date("2026-10-25T01:30:00Z"); // 02:30 heure d'hiver, après le recul
    const now = new Date("2026-10-24T23:45:00Z"); // 01:45 heure d'été
    const r = computePrice({ basePriceCents: 4000, startsAt: slot, now, fillRate: 0.5 });
    expect(r.hoursLeft).toBe(1.75);
    expect(r.discountPct).toBe(40);
  });
});

describe("courbe de prix", () => {
  it("est monotone décroissante avec les paliers par défaut", () => {
    const curve = priceCurve({ basePriceCents: 2500, tiers: DEFAULT_TIERS, fillRate: 0.5 });
    expect(curve[0]).toMatchObject({ hoursLeft: 96, unitPriceCents: 2500 });
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].unitPriceCents).toBeLessThanOrEqual(curve[i - 1].unitPriceCents);
    }
  });
});

describe("garde-fous", () => {
  it("refuse un prix de base non entier", () => {
    expect(() => computePrice({ ...base, basePriceCents: 12.5, now: at(5) })).toThrow();
  });
  it("refuse un nombre de personnes nul", () => {
    expect(() => quoteBooking(computePrice({ ...base, now: at(5) }), 0)).toThrow();
  });
});
