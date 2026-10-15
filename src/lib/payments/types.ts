export type PaymentMethod = "card" | "bancontact";

export type BookingForPayment = {
  id: string;
  reference: string;
  totalCents: number;
  description: string;
  customerEmail: string;
};

export type PaymentResult =
  | { status: "paid"; ref: string }
  | { status: "redirect"; url: string; ref: string }
  | { status: "declined"; message: string };

export interface PaymentProvider {
  readonly id: "mock" | "stripe";
  /** Le formulaire de carte est-il géré dans l'appli (mock) ou chez le prestataire (Stripe) ? */
  readonly collectsCardInApp: boolean;
  startPayment(
    booking: BookingForPayment,
    input: { method: PaymentMethod; cardNumber?: string; baseUrl: string },
  ): Promise<PaymentResult>;
  /** Vérifie le retour d'une redirection (Stripe Checkout). */
  verifyReturn?(sessionId: string): Promise<{ paid: boolean; bookingId: string | null; ref: string }>;
  refund(ref: string, amountCents: number): Promise<{ ok: boolean }>;
}
