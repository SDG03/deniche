import Stripe from "stripe";
import type { BookingForPayment, PaymentProvider, PaymentResult } from "./types";
import { copy } from "../copy";

/**
 * Stripe Checkout en mode test (carte + Bancontact). Activé avec
 * PAYMENT_PROVIDER=stripe et STRIPE_SECRET_KEY=sk_test_…
 * Le prix envoyé à Stripe est celui verrouillé par le serveur, jamais celui du client.
 */
export class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly collectsCardInApp = false;
  private stripe: Stripe;

  constructor(secretKey: string) {
    if (!secretKey.startsWith("sk_test_")) {
      throw new Error("Prototype : seule une clé Stripe de test (sk_test_…) est acceptée.");
    }
    this.stripe = new Stripe(secretKey);
  }

  async startPayment(booking: BookingForPayment, input: { baseUrl: string }): Promise<PaymentResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card", "bancontact"],
      customer_email: booking.customerEmail,
      locale: "fr",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: booking.totalCents,
            product_data: { name: booking.description },
          },
        },
      ],
      metadata: { bookingId: booking.id, reference: booking.reference },
      // Stripe impose au moins 30 min ; notre verrou de prix (10 min) reste la règle côté serveur.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${input.baseUrl}/reserver/${booking.id}/retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.baseUrl}/reserver/${booking.id}`,
    });
    if (!session.url) return { status: "declined", message: copy.errors.stripeNoUrl };
    return { status: "redirect", url: session.url, ref: session.id };
  }

  async verifyReturn(sessionId: string) {
    const s = await this.stripe.checkout.sessions.retrieve(sessionId);
    return {
      paid: s.payment_status === "paid",
      bookingId: s.metadata?.bookingId ?? null,
      ref: typeof s.payment_intent === "string" ? s.payment_intent : s.id,
    };
  }

  async refund(ref: string, amountCents: number) {
    if (!ref.startsWith("pi_")) return { ok: false };
    await this.stripe.refunds.create({ payment_intent: ref, amount: amountCents });
    return { ok: true };
  }
}
