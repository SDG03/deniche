import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityCard } from "@/components/activity-card";
import { MapView } from "@/components/map/map-view";
import { PageTitle } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { applyFilters, countActiveFilters, getCatalog, getUserPosition, parseFilters } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { getFavoriteIds } from "@/lib/favorites";
import { dayKey } from "@/lib/format";
import { ExplorerControls } from "./explorer-controls";

export const metadata: Metadata = { title: copy.explore.title };

export default async function ExplorerPage({ searchParams }: PageProps<"/explorer">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.vue === "carte" ? "carte" : "liste";
  const now = new Date();
  const { position } = await getUserPosition();
  const [catalog, favorites] = await Promise.all([getCatalog({ now, position }), getFavoriteIds()]);
  const results = applyFilters(catalog, filters, now);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 md:px-6 md:pt-10">
      <PageTitle title={copy.explore.title} />
      <ExplorerControls
        view={view}
        activeCount={countActiveFilters(filters)}
        resultCount={results.length}
        today={dayKey(now)}
      />

      <div className="mt-5">
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title={copy.explore.emptyTitle}
            body={copy.explore.emptyBody}
            action={
              <Link href="/explorer" className={buttonClass({ variant: "forest", size: "sm" })}>
                {copy.explore.reset}
              </Link>
            }
          />
        ) : view === "carte" ? (
          <div className="-mx-4 h-[calc(100dvh-330px)] min-h-[420px] overflow-hidden md:mx-0 md:h-[620px] md:rounded-[var(--radius-card)] md:border md:border-line">
            <MapView
              className="h-full w-full"
              you={position}
              points={results.map((a) => ({
                id: a.id,
                slug: a.slug,
                title: a.title,
                city: a.city,
                lat: a.latitude,
                lng: a.longitude,
                priceCents: a.fromPriceCents,
                discountPct: a.nextSlot?.discountPct ?? 0,
                image: a.image,
                href: `/activite/${a.slug}`,
              }))}
            />
          </div>
        ) : (
          <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((a, i) => (
              <li key={a.id}>
                <ActivityCard activity={a} isFavorite={favorites.has(a.id)} priority={i < 2} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
