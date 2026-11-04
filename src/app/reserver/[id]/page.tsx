import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { abandonCheckout } from "@/app/actions/booking";
import { DiscountBadge } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { getBookingForUser } from "@/lib/booking";
import { imageAlt } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { formatDayLong, formatMinutes, formatPrice, formatTime } from "@/lib/format";
import { releaseExpiredHolds } from "@/lib/inventory";
import { perkLabel } from "@/lib/loyalty";
import { firstAvailableReward } from "@/lib/rewards";
import { getPaymentProvider } from "@/lib/payments";
import { PayForm } from "./pay-form";

export const metadata: Metadata = { title: copy.booking.title, robots: { index: false } };

const t = copy.booking;

export default async function CheckoutPage({ params }: PageProps<"/reserver/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/reserver/${id}`);
  await releaseExpiredHolds();
  const booking = await getBookingForUser(id, user.id);
  if (!booking) notFound();
  if (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") redirect(`/reservation/${booking.id}`);

  const { slot } = booking;
  const a = slot.activity;
  const images = a.images as string[];
  const fullSeats = booking.people - booking.discountedSeats;
  const saved = booking.baseUnitPriceCents * booking.people - booking.totalCents;
  const restartHref = `/activite/${a.slug}?creneau=${slot.id}`;
  const firstName = user.name.replace(/\s*\(démo\)$/, "").split(" ")[0];
  const reward = await firstAvailableReward(user.id);

  return (
    <main id="contenu" className="mx-auto max-w-5xl px-4 pt-4 pb-10 md:px-6 md:pt-10">
      <form action={abandonCheckout}>
        <input type="hidden" name="bookingId" value={booking.id} />
        <button
          type="submit"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t.changeSlot}
        </button>
      </form>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{t.title}</h1>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
        <div className="order-2 md:order-1">
          {booking.status === "PENDING" ? (
            <PayForm
              bookingId={booking.id}
              people={booking.people}
              firstName={firstName}
              totalCents={booking.totalCents}
              lockedUntil={booking.priceLockedUntil.toISOString()}
              restartHref={restartHref}
              provider={getPaymentProvider().id}
              perk={reward ? perkLabel(reward.kind) : undefined}
            />
          ) : (
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-semibold">{t.lockExpired}</p>
              <a
                href={restartHref}
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-forest underline underline-offset-4"
              >
                {t.restart}
              </a>
            </div>
          )}
        </div>

        {/* Récapitulatif */}
        <aside className="order-1 md:sticky md:top-24 md:order-2">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
            <div className="flex gap-3 p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                <Image src={images[0]} alt={imageAlt(a.title, a.category)} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg leading-snug font-bold">{a.title}</h2>
                <p className="mt-0.5 text-xs text-ink-mute">{a.partner.name}</p>
              </div>
            </div>
            <ul className="space-y-2 border-t border-line px-4 py-3 text-sm">
              <li className="flex items-center gap-2">
                <Calendar aria-hidden className="size-4 text-ink-mute" />
                <span className="first-letter:uppercase">
                  {formatDayLong(slot.startsAt)} · {formatTime(slot.startsAt)} ({formatMinutes(a.durationMin)})
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Users aria-hidden className="size-4 text-ink-mute" />
                {t.participantsCount(booking.people)}
              </li>
              <li className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-mute" />
                {a.address}
              </li>
            </ul>
            <dl className="space-y-1.5 border-t border-line px-4 py-3 text-sm">
              {booking.discountedSeats > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-2">
                    {t.discountLine(booking.discountedSeats)}
                    <DiscountBadge pct={booking.discountPct} size="sm" />
                  </dt>
                  <dd className="tabular">
                    {booking.discountedSeats} × {formatPrice(booking.unitPriceCents)}
                  </dd>
                </div>
              )}
              {fullSeats > 0 && (
                <div className="flex justify-between gap-3">
                  <dt>{t.fullLine(fullSeats)}</dt>
                  <dd className="tabular">
                    {fullSeats} × {formatPrice(booking.baseUnitPriceCents)}
                  </dd>
                </div>
              )}
              {booking.discountedSeats > 0 && fullSeats > 0 && <p className="text-xs text-ink-mute">{t.quotaNote}</p>}
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
                <dt className="font-semibold">{t.total}</dt>
                <dd className="tabular font-display text-2xl font-bold">{formatPrice(booking.totalCents)}</dd>
              </div>
              {saved > 0 && (
                <p className="text-right text-sm font-semibold text-coral-ink">{t.saved(formatPrice(saved))}</p>
              )}
            </dl>
            <p className="border-t border-line bg-cream-deep px-4 py-2.5 text-xs text-ink-mute">
              {t.serverTruth} {copy.activity.cancellation} :{" "}
              {copy.activity.policies[a.cancellationPolicy].toLowerCase()}.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
