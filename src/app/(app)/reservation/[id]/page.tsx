import { CalendarPlus, CircleCheck, MapPin, Navigation, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelBooking } from "@/components/cancel-booking";
import { MobileHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { canCancel, cancellationDeadline, getBookingForUser } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatDayLong, formatPrice, formatTime } from "@/lib/format";
import { qrPayload, qrSvg } from "@/lib/qr";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };

const t = copy.confirmation;

export default async function BookingPage({ params, searchParams }: PageProps<"/reservation/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/reservation/${id}`);
  const booking = await getBookingForUser(id, user.id);
  if (!booking) notFound();
  if (booking.status === "PENDING") redirect(`/reserver/${booking.id}`);

  const { slot } = booking;
  const a = slot.activity;
  const isNew = sp.nouveau === "1";
  const active = booking.status === "CONFIRMED";
  const svg = active ? await qrSvg(qrPayload(booking.reference, booking.checkinCode)) : null;
  const when = `${formatDayLong(slot.startsAt)} à ${formatTime(slot.startsAt)}`;
  const deadline = cancellationDeadline(a.cancellationPolicy, slot.startsAt);
  const cancellable = active && canCancel(a.cancellationPolicy, slot.startsAt);
  const names = booking.participantNames as string[];
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}`;
  const statusLabel =
    booking.status === "CANCELLED"
      ? copy.bookings.cancelled
      : booking.status === "CHECKED_IN"
        ? copy.bookings.checkedIn
        : booking.status === "EXPIRED"
          ? copy.bookings.expired
          : null;

  return (
    <div>
      <MobileHeader back="/reservations" title={isNew ? undefined : a.title} />
      <div className="mx-auto max-w-xl px-4 pt-6 md:pt-12">
        {isNew && active && (
          <div className="animate-fade-up text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-forest text-cream">
              <CircleCheck aria-hidden className="size-7" />
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold">{t.title}</h1>
            <p className="mx-auto mt-2 max-w-sm text-ink-soft">{t.subtitle}</p>
          </div>
        )}

        <article className={cn("overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper", isNew && "mt-8")}>
          <div className="px-5 pt-5">
            {!isNew && <h1 className="font-display text-2xl leading-tight font-bold">{a.title}</h1>}
            {isNew && <h2 className="font-display text-xl leading-tight font-bold">{a.title}</h2>}
            <p className="mt-1 text-sm text-ink-mute first-letter:uppercase">{when}</p>
            {statusLabel && (
              <span className="mt-2 inline-flex rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-ink-soft">{statusLabel}</span>
            )}
          </div>

          {svg && (
            <div className="mx-5 mt-5 flex flex-col items-center rounded-2xl bg-cream px-5 py-6">
              <div
                role="img"
                aria-label={`QR code d'arrivée, code ${booking.checkinCode}`}
                className="size-48 [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="mt-4 text-xs font-semibold tracking-wide text-ink-mute uppercase">{t.code}</div>
              <div data-testid="checkin-code" className="tabular font-display text-3xl font-bold tracking-[0.2em]">{booking.checkinCode}</div>
            </div>
          )}

          {/* Ticket : séparation façon billet */}
          <div aria-hidden className="relative my-5 h-px border-t border-dashed border-line-strong">
            <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-cream" />
            <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-cream" />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-5 text-sm">
            <div>
              <dt className="text-xs text-ink-mute">{t.ref}</dt>
              <dd className="tabular font-semibold">{booking.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-mute">{copy.booking.total}</dt>
              <dd className="tabular font-semibold">
                {formatPrice(booking.totalCents)}
                {booking.discountPct > 0 && <span className="ml-1.5 text-coral-ink">−{booking.discountPct} %</span>}
              </dd>
            </div>
            <div className="col-span-2 flex items-start gap-2">
              <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-mute" />
              <dd>{names.length ? names.join(", ") : `${booking.people} participant(s)`}</dd>
            </div>
            <div className="col-span-2 flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-mute" />
              <dd>
                {a.address}
                <span className="block text-xs text-ink-mute">{a.partner.name}</span>
              </dd>
            </div>
          </dl>
        </article>

        {active && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ShareButton
              path={`/activite/${a.slug}?creneau=${slot.id}`}
              title={a.title}
              text={t.shareText(a.title, `le ${when}`)}
              className="w-full"
            />
            <a href={`/api/reservations/${booking.id}/ics`} className={buttonClass({ variant: "outline", className: "w-full" })}>
              <CalendarPlus aria-hidden className="size-4" />
              {t.addCalendar}
            </a>
            <a href={directions} target="_blank" rel="noreferrer" className={buttonClass({ variant: "outline", className: "w-full" })}>
              <Navigation aria-hidden className="size-4" />
              {t.directions}
            </a>
            <Link href="/reservations" className={buttonClass({ variant: "ghost", className: "w-full" })}>
              {t.seeBookings}
            </Link>
          </div>
        )}

        {active && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream-deep px-4 py-3 text-sm">
            <span className="text-ink-soft">
              {cancellable && deadline
                ? copy.bookings.cancellableUntil(`${formatDayLong(deadline)} à ${formatTime(deadline)}`)
                : copy.bookings.cannotCancel}
            </span>
            {cancellable && deadline && (
              <CancelBooking
                bookingId={booking.id}
                amount={formatPrice(booking.totalCents)}
                until={`${formatDayLong(deadline)} à ${formatTime(deadline)}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
