"use server";

import { getCatalog } from "@/lib/catalog";
import { imageAlt } from "@/lib/catalog";
import { surprise } from "@/lib/recommend";
import { getTriedCategories } from "@/lib/user-data";

export type WheelResult = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: string;
  categoryLabel: string;
  city: string;
  distanceKm: number;
  image: string;
  imageAlt: string;
  slot: { id: string; startsAt: string; unitPriceCents: number; basePriceCents: number; discountPct: number };
} | null;

/**
 * Tirage de la roue, fait côté serveur parmi les activités affichées sur la roue :
 * même pondération que « Surprends-moi » (catégories jamais essayées, proximité, réductions).
 */
export async function spinWheel(ids: string[]): Promise<WheelResult> {
  const allowed = new Set(ids.slice(0, 12).map(String));
  const now = new Date();
  const [catalog, tried] = await Promise.all([getCatalog({ now }), getTriedCategories()]);
  const pool = catalog.filter((a) => allowed.has(a.id));
  const hit = surprise(pool.length ? pool : catalog, tried, now);
  if (!hit) return null;
  const { a, slot } = hit;
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    tagline: a.tagline,
    category: a.category,
    categoryLabel: a.categoryLabel,
    city: a.city,
    distanceKm: a.distanceKm,
    image: a.image,
    imageAlt: imageAlt(a.title, a.category),
    slot: {
      id: slot.id,
      startsAt: slot.startsAt,
      unitPriceCents: slot.unitPriceCents,
      basePriceCents: slot.basePriceCents,
      discountPct: slot.discountPct,
    },
  };
}
