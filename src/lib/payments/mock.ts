import { randomCode } from "../codes";
import type { BookingForPayment, PaymentProvider, PaymentResult } from "./types";

/** Carte de refus de démonstration, comme chez Stripe. */
export const MOCK_DECLINED_CARD = "4000000000000002";
export const MOCK_TEST_CARD = "4242424242424242";

/** Fournisseur simulé : aucun réseau, aucune clé, comportement déterministe. */
export class MockProvider implements PaymentProvider {
  readonly id = "mock" as const;
  readonly collectsCardInApp = true;

  async startPayment(
    booking: BookingForPayment,
    input: { method: "card" | "bancontact"; cardNumber?: string },
  ): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 450)); // un peu de réalisme
    if (input.method === "card") {
      const digits = (input.cardNumber ?? "").replace(/\D/g, "");
      if (digits === MOCK_DECLINED_CARD) return { status: "declined", message: "Paiement refusé par la banque (carte de test de refus)." };
      if (!luhn(digits)) return { status: "declined", message: "Ce numéro de carte n'est pas valide." };
    }
    console.info(`[paiement simulé] ${booking.reference} · ${(booking.totalCents / 100).toFixed(2)} € · ${input.method}`);
    return { status: "paid", ref: `mock_${randomCode(10).toLowerCase()}` };
  }

  async refund(ref: string, amountCents: number) {
    console.info(`[remboursement simulé] ${ref} · ${(amountCents / 100).toFixed(2)} €`);
    return { ok: true };
  }
}

export function luhn(digits: string) {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
