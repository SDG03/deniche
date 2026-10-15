import { FlaskConical } from "lucide-react";
import { copy } from "@/lib/copy";

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-1.5 bg-forest px-4 py-1 text-center text-2xs font-medium tracking-wide text-cream/90">
      <FlaskConical aria-hidden className="size-3" />
      <span>{copy.brand.demoBanner}</span>
    </div>
  );
}
