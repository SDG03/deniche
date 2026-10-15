export const CATEGORIES = [
  { slug: "karting", label: "Karting", short: "Karting", blurb: "Gaz, virages, chrono." },
  { slug: "escalade", label: "Bloc & escalade", short: "Escalade", blurb: "Des prises et du vide." },
  { slug: "quad", label: "Quad & buggy", short: "Quad", blurb: "De la boue jusqu'aux oreilles." },
  { slug: "tir", label: "Paintball & tir", short: "Tir", blurb: "Viser juste, rire beaucoup." },
  { slug: "kayak", label: "Kayak", short: "Kayak", blurb: "Pagayer entre deux falaises." },
  { slug: "trail", label: "Trail", short: "Trail", blurb: "Courir là où il n'y a pas de route." },
  { slug: "trottinette", label: "Trottinette", short: "Trottinette", blurb: "Électrique, tout-terrain, silencieuse." },
  { slug: "atelier", label: "Ateliers créatifs", short: "Créatif", blurb: "Repartir avec un objet fait main." },
  { slug: "cuisine", label: "Ateliers culinaires", short: "Cuisine", blurb: "Mettre la main à la pâte." },
  { slug: "nature", label: "Nature & animaux", short: "Nature", blurb: "Marcher à côté d'un âne, ça calme." },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];
}
