import { Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ActivitySummary } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatKm, formatSlotWhen } from "@/lib/format";
import { FavoriteButton } from "./favorite-button";
import { DiscountBadge, PriceTag } from "./ui/primitives";

export function ActivityCard({
  activity: a,
  isFavorite,
  variant = "grid",
  priority,
  now,
}: {
  activity: ActivitySummary;
  isFavorite?: boolean;
  variant?: "grid" | "rail";
  priority?: boolean;
  now: Date;
}) {
  const slot = a.nextSlot;
  const href = slot ? `/activite/${a.slug}?creneau=${slot.id}` : `/activite/${a.slug}`;
  return (
    <article
      className={cn(
        "group relative flex flex-col",
        variant === "rail" && "w-[78vw] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
        <Image
          src={a.image}
          alt={a.imageAlt}
          fill
          priority={priority}
          sizes={variant === "rail" ? "300px" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {slot && slot.discountPct > 0 && <DiscountBadge pct={slot.discountPct} />}
        </div>
        <div className="absolute top-2 right-2">
          <FavoriteButton activityId={a.id} initial={!!isFavorite} title={a.title} />
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-mute">
          <span className="shrink-0 text-forest">{a.categoryLabel}</span>
          <span aria-hidden>·</span>
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">
            {a.city} · {formatKm(a.distanceKm)}
          </span>
        </div>
        <h3 className="mt-1 font-display text-lg leading-snug font-bold">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none">
            {a.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2">
          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap text-ink-soft">
            <Clock aria-hidden className="size-4 shrink-0 text-ink-mute" />
            <span>{slot ? formatSlotWhen(slot.startsAt, now) : copy.card.noSlot}</span>
          </div>
          <PriceTag
            prefix={copy.card.from}
            baseCents={slot && slot.discountPct > 0 ? slot.basePriceCents : a.fromPriceCents}
            currentCents={slot && slot.discountPct > 0 ? slot.unitPriceCents : a.fromPriceCents}
            className="shrink-0"
          />
        </div>
      </div>
    </article>
  );
}

export function ActivityCardSkeleton({ variant = "grid" }: { variant?: "grid" | "rail" }) {
  return (
    <div className={cn(variant === "rail" && "w-[78vw] max-w-[300px] shrink-0 md:w-auto md:max-w-none")}>
      <div className="skeleton aspect-[4/3] rounded-[var(--radius-card)]" />
      <div className="skeleton mt-3 h-3 w-1/2 rounded" />
      <div className="skeleton mt-2 h-5 w-4/5 rounded" />
      <div className="skeleton mt-3 h-4 w-full rounded" />
    </div>
  );
}
