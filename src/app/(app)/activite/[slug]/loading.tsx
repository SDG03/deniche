import { Skeleton } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl md:px-6 md:pt-8" aria-busy="true" aria-label={copy.common.loading}>
      <Skeleton className="aspect-[4/3] w-full rounded-none md:aspect-auto md:h-[440px] md:rounded-[var(--radius-card)]" />
      <div className="px-4 md:grid md:grid-cols-[minmax(0,1fr)_400px] md:gap-10 md:px-0">
        <div>
          <Skeleton className="mt-6 h-4 w-24" />
          <Skeleton className="mt-3 h-10 w-4/5" />
          <Skeleton className="mt-3 h-5 w-3/5" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-8 hidden h-96 rounded-[var(--radius-card)] md:block" />
      </div>
    </div>
  );
}
