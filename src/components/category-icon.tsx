import {
  ChefHat,
  Footprints,
  Gauge,
  Kayak,
  Mountain,
  Palette,
  PawPrint,
  Scooter,
  Target,
  Tractor,
  type LucideProps,
} from "lucide-react";
import type { CategorySlug } from "@/lib/categories";

const ICONS: Record<CategorySlug, React.ComponentType<LucideProps>> = {
  karting: Gauge,
  escalade: Mountain,
  quad: Tractor,
  tir: Target,
  kayak: Kayak,
  trail: Footprints,
  trottinette: Scooter,
  atelier: Palette,
  cuisine: ChefHat,
  nature: PawPrint,
};

export function CategoryIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = ICONS[slug as CategorySlug] ?? PawPrint;
  return <Icon aria-hidden strokeWidth={1.75} {...props} />;
}
