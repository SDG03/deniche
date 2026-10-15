import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingError, confirmBooking, getBookingForUser } from "@/lib/booking";
import { getPaymentProvider } from "@/lib/payments";

/** Retour de Stripe Checkout : on vérifie le paiement côté serveur avant de confirmer. */
export default async function StripeReturnPage({ params, searchParams }: PageProps<"/reserver/[id]/retour">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/reserver/${id}`);
  const booking = await getBookingForUser(id, user.id);
  if (!booking) notFound();
  const provider = getPaymentProvider();
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  if (!provider.verifyReturn || !sessionId) redirect(`/reserver/${id}`);

  const result = await provider.verifyReturn(sessionId);
  if (!result.paid || result.bookingId !== booking.id) redirect(`/reserver/${id}`);
  try {
    await confirmBooking(booking.id, { provider: provider.id, ref: result.ref });
  } catch (e) {
    if (e instanceof BookingError) {
      await provider.refund(result.ref, booking.totalCents);
      redirect(`/reserver/${id}`);
    }
    throw e;
  }
  redirect(`/reservation/${booking.id}?nouveau=1`);
}
