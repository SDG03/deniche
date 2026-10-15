import { ActivityCardSkeleton } from "@/components/activity-card";
import { Skeleton } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 md:px-6 md:pt-10" aria-busy="true" aria-label={copy.common.loading}>
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-5 h-12 w-full rounded-full" />
      <div className="mt-3 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>
      <ul className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <ActivityCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
