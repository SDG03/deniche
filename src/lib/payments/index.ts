import "server-only";
import { MockProvider } from "./mock";
import { StripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, PaymentResult } from "./types";

/** Mock par défaut ; Stripe (mode test) si PAYMENT_PROVIDER=stripe et une clé est fournie. */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "stripe" && process.env.STRIPE_SECRET_KEY) {
    return new StripeProvider(process.env.STRIPE_SECRET_KEY);
  }
  return new MockProvider();
}
