import { ArrowRight, Dices, Search, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ActivityCard } from "@/components/activity-card";
import { CategoryIcon } from "@/components/category-icon";
import { LocationChip } from "@/components/location-chip";
import { LogoMark } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { chipLinkClass } from "@/components/ui/chip";
import { DiscountBadge, EmptyState, PriceTag, SectionTitle } from "@/components/ui/primitives";
import { getCatalog, getUserPosition } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/categories";
import { copy } from "@/lib/copy";
import { getFavoriteIds } from "@/lib/favorites";
import { formatKm, formatSlotWhen } from "@/lib/format";
import { lastMinute, neverTried, pickOfTheDay } from "@/lib/recommend";
import { getTriedCategories } from "@/lib/user-data";

export default async function HomePage() {
  const now = new Date();
  const { position, isDefault } = await getUserPosition();
  const [catalog, favorites, tried] = await Promise.all([
    getCatalog({ now, position }),
    getFavoriteIds(),
    getTriedCategories(),
  ]);
  const urgent = lastMinute(catalog, now).slice(0, 8);
  const pick = pickOfTheDay(catalog, now);
  const fresh = neverTried(catalog, tried).slice(0, 8);
  const h = copy.home;

  return (
    <div className="mx-auto max-w-6xl">
      {/* En-tête mobile */}
      <div className="flex items-center justify-between px-4 pt-3 md:hidden">
        <Link href="/" aria-label={copy.common.homeLink} className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-display text-xl font-bold text-forest">Déniche</span>
        </Link>
        <LocationChip isDefault={isDefault} />
      </div>

      {/* Accroche */}
      <section className="px-4 pt-6 md:grid md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-10 md:px-6 md:pt-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-forest uppercase">{h.kicker}</p>
          <h1 className="mt-2 font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight md:text-6xl">
            {h.title}
          </h1>
          <p className="mt-3 max-w-md text-lg text-ink-soft">{h.subtitle}</p>

          <Link
            href="/explorer"
            className="mt-6 flex min-h-13 items-center gap-3 rounded-full border border-line-strong bg-paper px-5 py-3.5 text-ink-mute shadow-[0_1px_0_rgb(20_32_27/0.04)] transition-colors hover:border-ink/40"
          >
            <Search aria-hidden className="size-5 text-ink" />
            <span>{copy.explore.searchPlaceholder}</span>
          </Link>

          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            <Link href="/explorer?quand=today&tri=next" className={chipLinkClass()}>
              {h.quickWhen.today}
            </Link>
            <Link href="/explorer?quand=tomorrow&tri=next" className={chipLinkClass()}>
              {h.quickWhen.tomorrow}
            </Link>
            <Link href="/explorer?quand=weekend" className={chipLinkClass()}>
              {h.quickWhen.weekend}
            </Link>
            <span className="hidden md:inline-flex">
              <LocationChip isDefault={isDefault} />
            </span>
          </div>
        </div>

        {/* Surprends-moi */}
        <div className="mt-6 md:mt-0">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-forest p-5 text-cream md:p-7">
            <svg aria-hidden viewBox="0 0 200 200" className="absolute -top-10 -right-10 size-48 text-cream/[0.06]">
              <circle cx="100" cy="100" r="96" fill="currentColor" />
            </svg>
            <Dices aria-hidden className="size-8 text-coral" strokeWidth={1.75} />
            <h2 className="mt-3 font-display text-2xl font-bold">{h.surprise}</h2>
            <p className="mt-1 max-w-xs text-cream/80">{h.surpriseSub}</p>
            <a href="/surprise" className={buttonClass({ variant: "primary", size: "md", className: "mt-5" })}>
              <Dices aria-hidden className="size-5" />
              {h.surprise}
            </a>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section aria-labelledby="cats" className="mt-9 md:mt-14">
        <div className="px-4 md:px-6">
          <SectionTitle id="cats" title={h.categoriesTitle} />
        </div>
        <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-10 md:overflow-visible md:px-6">
          {CATEGORIES.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/explorer?categorie=${c.slug}`}
                className="group flex w-[76px] flex-col items-center gap-2 text-center md:w-auto"
              >
                <span className="grid size-16 place-items-center rounded-2xl border border-line bg-paper text-forest transition-colors duration-150 group-hover:border-forest group-hover:bg-forest-soft">
                  <CategoryIcon slug={c.slug} className="size-7" />
                </span>
                <span className="text-xs leading-tight font-medium text-ink-soft">{c.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Dernière minute */}
      <section aria-labelledby="lastminute" className="mt-10">
        <div className="px-4 md:px-6">
          <SectionTitle
            id="lastminute"
            title={h.lastMinuteTitle}
            sub={h.lastMinuteSub}
            action={
              <Link
                href="/explorer?quand=today&tri=next"
                className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-forest"
              >
                {h.seeAll} <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          />
        </div>
        {urgent.length ? (
          <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-6 md:[&>*:nth-child(n+5)]:hidden">
            {urgent.map((a, i) => (
              <ActivityCard
                key={a.id}
                activity={a}
                variant="rail"
                isFavorite={favorites.has(a.id)}
                priority={i < 2}
                now={now}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 md:px-6">
            <EmptyState icon={<Timer className="size-6" />} title={h.calmTitle} body={h.nothingLastMinute} />
          </div>
        )}
      </section>

      {/* Déniche du jour */}
      {pick && pick.nextSlot && (
        <section aria-labelledby="pick" className="mt-10 px-4 md:px-6">
          <SectionTitle id="pick" title={h.pickTitle} sub={h.pickSub} />
          <article className="group relative overflow-hidden rounded-[var(--radius-card)] bg-ink text-cream">
            <div className="relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9]">
              <Image
                src={pick.image}
                alt={pick.imageAlt}
                fill
                sizes="(min-width: 1152px) 1104px, 100vw"
                className="object-cover opacity-90 transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
              <div className="flex items-center gap-2 text-sm text-cream/85">
                <CategoryIcon slug={pick.category} className="size-4" />
                {pick.categoryLabel} · {pick.city} · {formatKm(pick.distanceKm)}
              </div>
              <h3 className="mt-2 max-w-xl font-display text-3xl leading-tight font-bold md:text-4xl">
                <Link href={`/activite/${pick.slug}`} className="after:absolute after:inset-0">
                  {pick.title}
                </Link>
              </h3>
              <p className="mt-2 max-w-lg text-cream/85">{pick.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-cream px-3 py-1.5 text-sm text-ink">
                  <PriceTag
                    prefix={copy.card.from}
                    baseCents={pick.basePriceCents}
                    currentCents={pick.fromPriceCents}
                  />
                </span>
                <span className="text-sm text-cream/85">{formatSlotWhen(pick.nextSlot.startsAt, now)}</span>
                {pick.bestDiscountPct > 0 && <DiscountBadge pct={pick.bestDiscountPct} />}
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Jamais essayé */}
      {fresh.length > 0 && (
        <section aria-labelledby="fresh" className="mt-10">
          <div className="px-4 md:px-6">
            <SectionTitle id="fresh" title={h.newForYouTitle} sub={h.newForYouSub} />
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-6 md:[&>*:nth-child(n+5)]:hidden">
            {fresh.map((a) => (
              <ActivityCard key={a.id} activity={a} variant="rail" isFavorite={favorites.has(a.id)} now={now} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
