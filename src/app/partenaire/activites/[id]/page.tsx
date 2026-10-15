import { ArrowLeft, ArrowUpRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseTiers } from "@/lib/activity-pricing";
import { requirePartner } from "@/lib/auth";
import { slotView } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatSlotWhen } from "@/lib/format";
import { getPartnerActivity } from "@/lib/partner";
import { weeklyTemplateSchema } from "@/lib/schedule";
import { DiscountBadge } from "@/components/ui/primitives";
import { ActivityForm } from "../activity-form";
import { PricingEditor } from "./pricing-editor";
import { ScheduleEditor } from "./schedule-editor";

const TABS = [
  { key: "infos", label: "Infos et photos" },
  { key: "creneaux", label: "Créneaux" },
  { key: "tarifs", label: "Réductions" },
] as const;

export async function generateMetadata({ params }: PageProps<"/partenaire/activites/[id]">) {
  const { id } = await params;
  const a = await db.activity.findUnique({ where: { id }, select: { title: true } });
  return { title: a?.title ?? "Activité" };
}

export default async function EditActivityPage({ params, searchParams }: PageProps<"/partenaire/activites/[id]">) {
  const { partnerId } = await requirePartner();
  const { id } = await params;
  const sp = await searchParams;
  const a = await getPartnerActivity(partnerId, id);
  if (!a) notFound();
  const tab = TABS.find((t) => t.key === sp.onglet)?.key ?? "infos";
  const now = new Date();

  const upcoming =
    tab === "creneaux"
      ? await db.slot.findMany({
          where: { activityId: a.id, startsAt: { gt: now } },
          orderBy: { startsAt: "asc" },
          take: 14,
        })
      : [];

  return (
    <div>
      <Link href="/partenaire/activites" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> Activités
      </Link>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{a.title}</h1>
        {a.published && (
          <Link href={`/activite/${a.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest">
            Voir la fiche <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      {sp.cree === "1" && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-forest-soft px-4 py-3 text-sm font-semibold text-forest">
          <CircleCheck aria-hidden className="size-5" />
          Activité créée, avec des créneaux le week-end. Règle tes horaires et tes réductions ci-dessous.
        </p>
      )}

      <nav aria-label="Sections" className="mt-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partenaire/activites/${a.id}?onglet=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-12 items-center border-b-2 px-3 text-sm font-semibold transition-colors",
              tab === t.key ? "border-forest text-forest" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "infos" && (
          <ActivityForm
            values={{
              id: a.id,
              title: a.title,
              tagline: a.tagline,
              category: a.category,
              description: a.description,
              address: a.address,
              city: a.city,
              latitude: a.latitude,
              longitude: a.longitude,
              durationMin: a.durationMin,
              minPeople: a.minPeople,
              maxPeople: a.maxPeople,
              basePrice: a.basePriceCents / 100,
              minAge: a.minAge,
              setting: a.setting,
              level: a.level,
              accessibility: a.accessibility,
              tags: (a.tags as string[]).join(", "),
              cancellationPolicy: a.cancellationPolicy,
              published: a.published,
              images: (a.images as string[]).filter((src) => !src.startsWith("/images/covers/")),
            }}
          />
        )}

        {tab === "creneaux" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="modele">
              <h2 id="modele" className="font-display text-xl font-bold">
                Modèle hebdomadaire
              </h2>
              <p className="mt-1 mb-4 text-sm text-ink-mute">Choisis tes jours, tes horaires et le nombre de places par créneau.</p>
              <ScheduleEditor
                activityId={a.id}
                initial={weeklyTemplateSchema.safeParse(a.weeklyTemplate).data ?? []}
                defaultCapacity={Math.min(10, a.maxPeople)}
              />
            </section>
            <section aria-labelledby="prochains">
              <h2 id="prochains" className="font-display text-xl font-bold">
                Prochains créneaux
              </h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
                {upcoming.map((s) => {
                  const v = slotView(a, s, now);
                  const fill = s.capacity ? s.bookedCount / s.capacity : 0;
                  return (
                    <li key={s.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold first-letter:uppercase">{formatSlotWhen(s.startsAt, now)}</span>
                        <DiscountBadge pct={v.discountPct} size="sm" />
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand" role="presentation">
                        <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, fill * 100)}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-ink-mute">
                        {s.bookedCount}/{s.capacity} places · {v.tierLabel}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {tab === "tarifs" && (
          <PricingEditor
            activityId={a.id}
            basePriceCents={a.basePriceCents}
            initial={{
              lastMinuteEnabled: a.lastMinuteEnabled,
              fillBonusEnabled: a.fillBonusEnabled,
              floorPct: a.floorPct,
              quotaPct: a.quotaPct,
              cutoffMinutes: a.cutoffMinutes,
              tiers: parseTiers(a.discountTiers),
            }}
          />
        )}
      </div>
    </div>
  );
}
