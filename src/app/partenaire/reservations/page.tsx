import { Inbox } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/ui/primitives";
import { requirePartner } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { getPartnerBookings } from "@/lib/partner";
import { BookingRow } from "../booking-row";

export const metadata = { title: copy.partner.bookings };

const TABS = [
  { key: "recentes", label: "Reçues récemment" },
  { key: "a-venir", label: "À venir" },
  { key: "passees", label: "Passées" },
] as const;

export default async function PartnerBookingsPage({ searchParams }: PageProps<"/partenaire/reservations">) {
  const { partnerId } = await requirePartner();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.vue)?.key ?? "recentes";
  const now = new Date();
  const list =
    tab === "recentes"
      ? await getPartnerBookings(partnerId, { take: 40 })
      : tab === "a-venir"
        ? await getPartnerBookings(partnerId, { from: now, orderBy: "slot", take: 100 })
        : (await getPartnerBookings(partnerId, { to: now, take: 300 })).sort((a, b) => b.slot.startsAt.getTime() - a.slot.startsAt.getTime()).slice(0, 60);

  return (
    <div>
      <AutoRefresh />
      <h1 className="font-display text-3xl font-bold">{copy.partner.bookings}</h1>
      <p className="mt-1 text-sm text-ink-mute">La liste se met à jour toute seule. Les nouvelles réservations sont surlignées.</p>
      <nav aria-label="Filtrer" className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partenaire/reservations?vue=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
              tab === t.key ? "border-forest bg-forest text-cream" : "border-line-strong bg-paper hover:border-ink/40",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        {list.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
            {list.map((b) => (
              <BookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Inbox className="size-6" />} title="Aucune réservation" body="Elles apparaîtront ici dès qu'un client réserve." />
        )}
      </div>
    </div>
  );
}
