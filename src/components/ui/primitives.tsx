import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/** Badge de réduction « −30 % » — corail, réservé aux réductions. */
export function DiscountBadge({ pct, className, size = "md" }: { pct: number; className?: string; size?: "sm" | "md" }) {
  if (pct <= 0) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center rounded-full bg-coral font-bold text-ink",
        size === "sm" ? "px-1.5 py-px text-2xs" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      −{pct}&nbsp;%
    </span>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Prix barré + prix actuel. */
export function PriceTag({
  baseCents,
  currentCents,
  prefix,
  size = "md",
  className,
}: {
  baseCents: number;
  currentCents: number;
  prefix?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const discounted = currentCents < baseCents;
  return (
    <span className={cn("tabular inline-flex items-baseline gap-1.5", className)}>
      {prefix && <span className="text-xs text-ink-mute">{prefix}</span>}
      {discounted && (
        <s className={cn("text-ink-mute", size === "lg" ? "text-base" : "text-xs")} aria-label={`au lieu de ${formatPrice(baseCents)}`}>
          {formatPrice(baseCents, { short: true })}
        </s>
      )}
      <span
        className={cn(
          "font-bold",
          discounted ? "text-coral-ink" : "text-ink",
          size === "lg" ? "font-display text-2xl" : size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {formatPrice(currentCents, { short: true })}
      </span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-forest-soft text-forest">{icon}</div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-ink-mute">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  sub,
  action,
  id,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-display text-[1.375rem] leading-tight font-bold">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-sm text-ink-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <div className="text-xs font-medium text-ink-mute">{label}</div>
      <div className="tabular mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-mute">{hint}</div>}
    </div>
  );
}
