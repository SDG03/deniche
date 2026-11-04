import type { Metadata } from "next";
import { Dices } from "lucide-react";
import { MobileHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/primitives";
import { getCatalog, getUserPosition } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/categories";
import { copy } from "@/lib/copy";
import { Wheel } from "./wheel";

export const metadata: Metadata = { title: copy.wheel.title };

const SEGMENTS = 8;

export default async function SurprisePage() {
  const now = new Date();
  const { position } = await getUserPosition();
  const catalog = (await getCatalog({ now, position })).filter((a) => a.nextSlot);

  // Une activité par catégorie (la plus proche), dans l'ordre des catégories pour varier les couleurs.
  const byCategory = CATEGORIES.map(
    (c) => catalog.filter((a) => a.category === c.slug).sort((x, y) => x.distanceKm - y.distanceKm)[0],
  ).filter((a) => a !== undefined);
  const picked = byCategory.slice(0, SEGMENTS);
  for (const a of catalog.sort((x, y) => x.distanceKm - y.distanceKm)) {
    if (picked.length >= SEGMENTS) break;
    if (!picked.includes(a)) picked.push(a);
  }

  return (
    <div>
      <MobileHeader back="/" title={copy.wheel.title} />
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6 md:pt-10">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{copy.wheel.title}</h1>
        <p className="mt-1 text-ink-soft">{copy.wheel.intro}</p>
        <div className="mt-6">
          {picked.length === 0 ? (
            <EmptyState icon={<Dices className="size-6" />} title={copy.wheel.title} body={copy.wheel.empty} />
          ) : (
            <Wheel
              segments={picked.map((a) => ({
                id: a.id,
                category: a.category,
                label: CATEGORIES.find((c) => c.slug === a.category)?.short ?? a.categoryLabel,
                city: a.city.replace(/\s*\(.*\)$/, ""),
                title: a.title,
              }))}
            />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-ink-mute">{copy.wheel.fairness}</p>
      </div>
    </div>
  );
}
