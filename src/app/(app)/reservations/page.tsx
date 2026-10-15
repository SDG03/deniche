import { CalendarX2, ChevronRight, History, LogIn } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageTitle } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { canCancel } from "@/lib/booking";
import { imageAlt } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { formatPrice, formatSlotWhen } from "@/lib/format";
import { releaseExpiredHolds } from "@/lib/inventory";

export const metadata: Metadata = { title: copy.bookings.title };

const t = copy.bookings;

export default async function BookingsPage({ searchParams }: PageProps<"/reservations">) {
  const sp = await searchParams;
  const tab = sp.onglet === "passees" ? "past" : "upcoming";
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-10">
        <PageTitle title={t.title} />
        <EmptyState
          icon={<LogIn className="size-6" />}
          title={copy.profile.guest}
          body={copy.profile.guestBody}
          action={
            <Link href="/connexion?next=/reservations" className={buttonClass({ variant: "forest", size: "sm" })}>
              {copy.auth.title}
            </Link>
          }
        />
      </div>
    );
  }

  await releaseExpiredHolds();
  const now = new Date();
  const bookings = await db.booking.findMany({
    where: { userId: user.id, status: { not: "EXPIRED" } },
    include: { slot: { include: { activity: true } } },
    orderBy: { slot: { startsAt: tab === "past" ? "desc" : "asc" } },
  });
  const list = bookings.filter((b) =>
    tab === "past"
      ? b.slot.startsAt < now || b.status === "CANCELLED"
      : b.slot.startsAt >= now && b.status !== "CANCELLED",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-10">
      <PageTitle title={t.title} />
      <div
        role="tablist"
        aria-label={t.title}
        className="inline-flex rounded-full border border-line-strong bg-paper p-1"
      >
        {(
          [
            ["upcoming", t.upcoming, "/reservations"],
            ["past", t.past, "/reservations?onglet=passees"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={tab === key}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
              tab === key ? "bg-forest text-cream" : "text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          tab === "upcoming" ? (
            <EmptyState
              icon={<CalendarX2 className="size-6" />}
              title={t.emptyUpcomingTitle}
              body={t.emptyUpcomingBody}
              action={
                <Link href="/explorer" className={buttonClass({ variant: "primary", size: "sm" })}>
                  {copy.nav.explore}
                </Link>
              }
            />
          ) : (
            <EmptyState icon={<History className="size-6" />} title={t.emptyPastTitle} body={t.emptyPastBody} />
          )
        ) : (
          <ul className="space-y-3">
            {list.map((b) => {
              const a = b.slot.activity;
              const status =
                b.status === "PENDING"
                  ? t.pending
                  : b.status === "CANCELLED"
                    ? t.cancelled
                    : b.status === "CHECKED_IN"
                      ? t.checkedIn
                      : null;
              const href = b.status === "PENDING" ? `/reserver/${b.id}` : `/reservation/${b.id}`;
              return (
                <li key={b.id}>
                  <Link
                    href={href}
                    className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper p-3 transition-colors hover:border-ink/30"
                  >
                    <div
                      className={cn(
                        "relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand",
                        b.status === "CANCELLED" && "grayscale",
                      )}
                    >
                      <Image
                        src={(a.images as string[])[0]}
                        alt={imageAlt(a.title, a.category)}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-ink-mute first-letter:uppercase">
                        {formatSlotWhen(b.slot.startsAt, now)}
                      </div>
                      <h2 className="mt-0.5 line-clamp-2 font-display text-lg leading-snug font-bold">{a.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                        <span>
                          {b.people} pers. · {formatPrice(b.totalCents)}
                        </span>
                        {b.discountPct > 0 && <span className="font-semibold text-coral-ink">−{b.discountPct} %</span>}
                        {status && (
                          <span className="rounded-full bg-sand px-2 py-0.5 text-2xs font-semibold">{status}</span>
                        )}
                        {tab === "upcoming" &&
                          b.status === "CONFIRMED" &&
                          !canCancel(a.cancellationPolicy, b.slot.startsAt) && (
                            <span className="text-2xs text-ink-mute">
                              {a.cancellationPolicy === "STRICT"
                                ? copy.activity.policies.STRICT
                                : t.noLongerCancellable}
                            </span>
                          )}
                      </div>
                    </div>
                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
