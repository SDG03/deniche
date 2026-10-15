import { ActivityCardSkeleton } from "@/components/activity-card";
import { Skeleton } from "@/components/ui/primitives";

/** Squelette par défaut des pages de l'appli (accueil, favoris, réservations…). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-12" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-12 w-3/4 max-w-md" />
      <Skeleton className="mt-3 h-5 w-2/3 max-w-sm" />
      <Skeleton className="mt-6 h-13 w-full max-w-xl rounded-full" />
      <div className="mt-10 flex gap-4 overflow-hidden md:grid md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <ActivityCardSkeleton key={i} variant="rail" />
        ))}
      </div>
    </div>
  );
}
