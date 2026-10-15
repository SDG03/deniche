import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import { addDays } from "date-fns";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, Stat } from "@/components/ui/primitives";
import { requirePartner } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { dayKey, formatPrice, inBrussels, startOfBrusselsDay } from "@/lib/format";
import { getPartnerBookings, getPartnerStats } from "@/lib/partner";
import { BookingRow } from "./booking-row";

export const metadata = { title: copy.partner.dashboard };

const pct = (n: number) => `${Math.round(n * 100)} %`;

export default async function PartnerDashboard() {
  const { partnerId } = await requirePartner();
  const now = new Date();
  const todayStart = startOfBrusselsDay(dayKey(now));
  const tomorrowStart = startOfBrusselsDay(dayKey(addDays(inBrussels(now), 1)));
  const [stats, latest, today] = await Promise.all([
    getPartnerStats(partnerId, now),
    getPartnerBookings(partnerId, { from: now, take: 6, excludeCancelled: true }),
    getPartnerBookings(partnerId, { from: todayStart, to: tomorrowStart, orderBy: "slot", take: 50 }),
  ]);
  const s = copy.partner.stats;
  const arrivals = today.filter((b) => b.status !== "CANCELLED" && b.slot.startsAt.getTime() > now.getTime() - 3 * 3_600_000).slice(0, 8);

  return (
    <div className="space-y-10">
      <AutoRefresh />
      <section aria-labelledby="stats">
        <div className="flex items-baseline justify-between gap-3">
          <h1 id="stats" className="font-display text-3xl font-bold">
            {copy.partner.dashboard}
          </h1>
          <span className="text-sm text-ink-mute">{s.period}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={s.fill} value={pct(stats.fillRate)} hint={`${stats.seats} places vendues`} />
          <Stat label={s.revenue} value={formatPrice(stats.revenueCents, { short: true })} hint={`${stats.bookings} réservations`} />
          <Stat label={s.lastMinute} value={pct(stats.lastMinuteShare)} hint="réservées moins de 24 h avant" />
          <Stat label="Réductions accordées" value={formatPrice(stats.savedCents, { short: true })} hint="sur des places qui seraient restées vides" />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="today">
          <h2 id="today" className="font-display text-xl font-bold">
            Arrivées du jour
          </h2>
          {arrivals.length ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
              {arrivals.map((b) => (
                <BookingRow key={b.id} b={b} now={now} />
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState icon={<Inbox className="size-6" />} title="Personne aujourd'hui" body="Profites-en pour régler tes réductions : un créneau vide ne rapporte rien." />
            </div>
          )}

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">Dernières réservations</h2>
            <Link href="/partenaire/reservations" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest">
              Tout voir <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <ul className="mt-1 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
            {latest.map((b) => (
              <BookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="per-activity">
          <h2 id="per-activity" className="font-display text-xl font-bold">
            Remplissage par activité
          </h2>
          <p className="text-sm text-ink-mute">{s.period}, créneaux passés</p>
          <ul className="mt-4 space-y-4">
            {stats.perActivity.map((a) => (
              <li key={a.id} title={`${a.title} : ${pct(a.fillRate)} (${a.seats} places, ${formatPrice(a.revenueCents)})`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{a.title}</span>
                  <span className="tabular shrink-0 font-semibold">{pct(a.fillRate)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand" role="presentation">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, a.fillRate * 100)}%` }} />
                </div>
                <div className="mt-1 text-xs text-ink-mute">
                  {a.seats} places · {formatPrice(a.revenueCents, { short: true })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
