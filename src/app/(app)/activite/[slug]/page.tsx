import {
  Accessibility,
  Car,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Users,
  Baby,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/activity-card";
import { CategoryIcon } from "@/components/category-icon";
import { FavoriteButton } from "@/components/favorite-button";
import { MapView } from "@/components/map/map-view";
import { MobileHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { getCatalog, getUserPosition, imageAlt } from "@/lib/catalog";
import { getCategory } from "@/lib/categories";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { getFavoriteIds } from "@/lib/favorites";
import { brusselsDays, formatKm, formatMinutes } from "@/lib/format";
import { HORIZON_DAYS } from "@/lib/inventory";
import { Gallery } from "./gallery";
import { SlotPicker } from "./slot-picker";

const t = copy.activity;

export async function generateMetadata({ params }: PageProps<"/activite/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await db.activity.findUnique({ where: { slug }, select: { title: true, tagline: true, images: true } });
  if (!a) return {};
  return { title: a.title, description: a.tagline, openGraph: { images: [(a.images as string[])[0]] } };
}

export default async function ActivityPage({ params, searchParams }: PageProps<"/activite/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const now = new Date();
  const { position } = await getUserPosition();
  const [catalog, favorites] = await Promise.all([getCatalog({ now, position }), getFavoriteIds()]);
  const summary = catalog.find((a) => a.slug === slug);
  if (!summary) notFound();

  const activity = await db.activity.findUniqueOrThrow({
    where: { slug },
    include: { partner: true, reviews: { orderBy: { createdAt: "desc" }, take: 4 } },
  });
  const images = activity.images as string[];
  const credits = activity.imageCredits as { author: string; license: string; source: string }[];
  const category = getCategory(activity.category);
  const initialSlotId = typeof sp.creneau === "string" ? sp.creneau : undefined;
  const fromSurprise = sp.surprise === "1";
  const sharedSlot = !!initialSlotId && !fromSurprise;

  const similar = catalog
    .filter((a) => a.id !== summary.id && a.nextSlot)
    .map((a) => ({
      a,
      score:
        (a.category === summary.category ? 3 : 0) +
        a.tags.filter((tag) => summary.tags.includes(tag)).length -
        a.distanceKm / 50,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.a);

  const info = [
    { icon: Clock, label: t.duration, value: formatMinutes(activity.durationMin) },
    { icon: Baby, label: t.minAge, value: t.minAgeValue(activity.minAge) },
    { icon: Sun, label: t.setting, value: copy.explore.filter.settings[activity.setting] },
    { icon: Gauge, label: t.level, value: t.levels[activity.level] },
    { icon: Users, label: t.group, value: t.groupValue(activity.minPeople, activity.maxPeople) },
    { icon: ShieldCheck, label: t.cancellation, value: t.policies[activity.cancellationPolicy] },
  ];
  const rating = summary.ratingCount ? summary.ratingAvg.toFixed(1).replace(".", ",") : null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${activity.latitude},${activity.longitude}`;

  return (
    <div className="pb-24 md:pb-0">
      <MobileHeader
        back="/explorer"
        title={activity.title}
        action={
          <FavoriteButton
            activityId={activity.id}
            initial={favorites.has(activity.id)}
            title={activity.title}
            className="bg-transparent"
          />
        }
      />

      <div className="mx-auto max-w-6xl md:px-6 md:pt-8">
        <Gallery
          images={images}
          alts={images.map((_, i) => imageAlt(activity.title, activity.category, i))}
          credits={credits}
        />

        <div className="md:mt-8 md:grid md:grid-cols-[minmax(0,1fr)_400px] md:gap-10">
          {/* Colonne contenu */}
          <div className="px-4 md:px-0">
            {(fromSurprise || sharedSlot) && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest-soft px-3.5 py-2 text-sm font-semibold text-forest">
                <Sparkles aria-hidden className="size-4" />
                {fromSurprise ? t.surpriseNote : t.sharedSlot}
                {fromSurprise && (
                  <a href="/surprise" className="underline underline-offset-2">
                    {t.reroll}
                  </a>
                )}
              </p>
            )}
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-forest md:mt-0">
              <CategoryIcon slug={category.slug} className="size-4" />
              {category.label}
            </div>
            <div className="mt-1 flex items-start justify-between gap-4">
              <h1 className="font-display text-[2rem] leading-[1.08] font-bold md:text-[2.75rem]">{activity.title}</h1>
              <div className="hidden md:block">
                <FavoriteButton
                  activityId={activity.id}
                  initial={favorites.has(activity.id)}
                  title={activity.title}
                  className="border border-line"
                />
              </div>
            </div>
            <p className="mt-2 text-lg text-ink-soft">{activity.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-mute">
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-4" />
                {activity.city} · {formatKm(summary.distanceKm)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Car aria-hidden className="size-4" />
                {copy.card.drive(summary.driveMin)}
              </span>
              {rating && (
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden className="size-4 fill-ink text-ink" />
                  {rating} <span className="text-ink-mute">({summary.ratingCount})</span>
                </span>
              )}
            </div>

            {/* Créneaux — sur mobile dans le flux */}
            <section aria-labelledby="creneaux" className="mt-8 md:hidden">
              <SlotPicker
                activity={{ slug, title: activity.title, minPeople: activity.minPeople, maxPeople: activity.maxPeople }}
                slots={summary.slots}
                days={brusselsDays(now, HORIZON_DAYS)}
                initialSlotId={initialSlotId}
              />
            </section>

            <section aria-labelledby="essentiel" className="mt-10">
              <h2 id="essentiel" className="font-display text-[1.375rem] font-bold">
                {t.keyInfo}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {info.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl border border-line bg-paper p-3.5">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-mute">
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </dt>
                    <dd className="mt-1 text-[0.9375rem] font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex gap-2 rounded-2xl bg-cream-deep p-3.5 text-sm text-ink-soft">
                <Accessibility aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-semibold">{t.accessibility} · </span>
                  {activity.accessibility}
                </span>
              </p>
            </section>

            <section aria-labelledby="about" className="mt-10">
              <h2 id="about" className="font-display text-[1.375rem] font-bold">
                {t.about}
              </h2>
              <div className="mt-3 max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-ink-soft">
                {activity.description.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-5 text-sm text-ink-mute">
                {t.partner} <span className="font-semibold text-ink">{activity.partner.name}</span>
              </p>
            </section>

            <section aria-labelledby="where" className="mt-10">
              <h2 id="where" className="font-display text-[1.375rem] font-bold">
                {t.itinerary}
              </h2>
              <p className="mt-1 text-sm text-ink-mute">{activity.address}</p>
              <div className="mt-3 h-56 overflow-hidden rounded-[var(--radius-card)] border border-line">
                <MapView
                  className="h-full w-full"
                  you={position}
                  zoomControl={false}
                  points={[
                    {
                      id: activity.id,
                      slug,
                      title: activity.title,
                      city: activity.city,
                      lat: activity.latitude,
                      lng: activity.longitude,
                      priceCents: summary.fromPriceCents,
                      discountPct: 0,
                      image: images[0],
                      href: directions,
                    },
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={directions}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <Navigation aria-hidden className="size-4" />
                  {t.openMaps}
                </a>
                <span className="text-sm text-ink-mute">
                  {formatKm(summary.distanceKm)} · {copy.card.drive(summary.driveMin)} {t.estimate}
                </span>
              </div>
            </section>

            {activity.reviews.length > 0 && (
              <section aria-labelledby="reviews" className="mt-10">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="reviews" className="font-display text-[1.375rem] font-bold">
                    {t.reviews}
                  </h2>
                  <span className="rounded-full bg-sand px-2.5 py-1 text-2xs font-semibold text-ink-soft">
                    {t.reviewsMock}
                  </span>
                </div>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {activity.reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-line bg-paper p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{r.authorName}</span>
                        <span className="flex gap-0.5" aria-label={copy.common.outOf5(r.rating)}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              aria-hidden
                              className={`size-3.5 ${n <= r.rating ? "fill-ink text-ink" : "text-line-strong"}`}
                            />
                          ))}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Colonne réservation (desktop) */}
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-[0_1px_2px_rgb(20_32_27/0.04)]">
              <SlotPicker
                activity={{ slug, title: activity.title, minPeople: activity.minPeople, maxPeople: activity.maxPeople }}
                slots={summary.slots}
                days={brusselsDays(now, HORIZON_DAYS)}
                initialSlotId={initialSlotId}
                headingId="creneaux-desktop"
              />
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="similar" className="mt-14 px-4 md:px-0">
            <h2 id="similar" className="font-display text-[1.375rem] font-bold">
              {t.similar}
            </h2>
            <ul className="mt-4 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((a) => (
                <li key={a.id}>
                  <ActivityCard activity={a} isFavorite={favorites.has(a.id)} now={now} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-10 px-4 text-center text-xs text-ink-mute md:px-0">
          <Link href="/legal/annulation" className="underline underline-offset-2">
            {t.cancellationLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
