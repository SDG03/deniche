import { ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth";
import { imageAlt } from "@/lib/catalog";
import { getCategory } from "@/lib/categories";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const metadata = { title: copy.partner.activities };

export default async function PartnerActivities() {
  const { partnerId } = await requirePartner();
  const now = new Date();
  const activities = await db.activity.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { slots: { where: { startsAt: { gt: now, lt: new Date(now.getTime() + 7 * 86_400_000) } } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{copy.partner.activities}</h1>
        <Link href="/partenaire/activites/nouvelle" className={buttonClass({ variant: "forest", size: "sm" })}>
          <Plus aria-hidden className="size-4" />
          {copy.partner.newActivity}
        </Link>
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {activities.map((a) => {
          const cap = a.slots.reduce((t, s) => t + s.capacity, 0);
          const booked = a.slots.reduce((t, s) => t + s.bookedCount, 0);
          return (
            <li key={a.id}>
              <Link
                href={`/partenaire/activites/${a.id}`}
                className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper p-3 hover:border-ink/30"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                  <Image src={(a.images as string[])[0]} alt={imageAlt(a.title, a.category)} fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-mute">
                    {getCategory(a.category).label}
                    {!a.published && <span className="rounded-full bg-sand px-2 py-0.5 text-2xs font-semibold text-ink-soft">Brouillon</span>}
                    {!a.lastMinuteEnabled && <span className="rounded-full bg-sand px-2 py-0.5 text-2xs font-semibold text-ink-soft">Prix fixe</span>}
                  </div>
                  <h2 className="mt-0.5 line-clamp-2 font-display text-lg leading-snug font-bold">{a.title}</h2>
                  <div className="mt-1 text-sm text-ink-soft">
                    {formatPrice(a.basePriceCents, { short: true })} · {a.slots.length} créneaux cette semaine ·{" "}
                    {cap ? Math.round((booked / cap) * 100) : 0} % rempli
                  </div>
                </div>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-mute" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
