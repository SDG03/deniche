"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/actions/favorites";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

export function FavoriteButton({
  activityId,
  initial,
  title,
  className,
}: {
  activityId: string;
  initial: boolean;
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(initial);

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={`${fav ? copy.favorites.remove : copy.favorites.add} : ${title}`}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          setFav(!fav);
          const r = await toggleFavorite(activityId);
          if (r.needsLogin) router.push(`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`);
          else router.refresh();
        });
      }}
      className={cn(
        "relative z-10 grid size-11 place-items-center rounded-full bg-paper/90 text-ink backdrop-blur transition-transform duration-150 active:scale-90",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-5 transition-colors duration-150", fav ? "fill-coral text-coral" : "text-ink")}
        strokeWidth={2}
      />
    </button>
  );
}
