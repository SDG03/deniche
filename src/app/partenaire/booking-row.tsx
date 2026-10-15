import { Check } from "lucide-react";
import { quickCheckin } from "@/app/actions/partner";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatPrice, formatSlotWhen } from "@/lib/format";

export type PartnerBooking = {
  id: string;
  reference: string;
  status: string;
  people: number;
  totalCents: number;
  discountPct: number;
  createdAt: Date;
  user: { name: string };
  slot: { startsAt: Date; activity: { title: string } };
};

export function BookingRow({ b, now, showActivity = true }: { b: PartnerBooking; now: Date; showActivity?: boolean }) {
  const isNew = now.getTime() - b.createdAt.getTime() < 15 * 60_000;
  const lastMinute = b.slot.startsAt.getTime() - b.createdAt.getTime() < 86_400_000;
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3",
        isNew && "animate-fade-up bg-coral-soft/50",
      )}
    >
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{b.user.name}</span>
          <span className="tabular text-xs text-ink-mute">{b.reference}</span>
          {isNew && (
            <span className="rounded-full bg-coral px-2 py-0.5 text-2xs font-bold text-ink">
              {copy.partnerUi.row.isNew}
            </span>
          )}
          {lastMinute && b.status !== "CANCELLED" && (
            <span className="rounded-full bg-forest-soft px-2 py-0.5 text-2xs font-semibold text-forest">
              {copy.partnerUi.row.lastMinute}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-ink-soft">
          {showActivity && <>{b.slot.activity.title} · </>}
          <span className="first-letter:uppercase">{formatSlotWhen(b.slot.startsAt, now)}</span> · {b.people} pers. ·{" "}
          <span className="tabular">{formatPrice(b.totalCents)}</span>
          {b.discountPct > 0 && <span className="text-coral-ink"> (−{b.discountPct} %)</span>}
        </div>
      </div>
      {b.status === "CONFIRMED" ? (
        <form action={quickCheckin}>
          <input type="hidden" name="bookingId" value={b.id} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 text-sm font-semibold hover:border-forest hover:text-forest"
          >
            <Check aria-hidden className="size-4" />
            {copy.partnerUi.row.checkin}
          </button>
        </form>
      ) : (
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            b.status === "CHECKED_IN" ? "bg-forest text-cream" : "bg-sand text-ink-soft",
          )}
        >
          {b.status === "CHECKED_IN" ? copy.bookings.checkedIn : copy.bookings.cancelled}
        </span>
      )}
    </li>
  );
}
