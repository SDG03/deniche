import { cn } from "@/lib/cn";

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

/** Chip de filtre (toggle). Cible tactile 44 px via min-h-11. */
export function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
        selected ? "border-forest bg-forest text-cream" : "border-line-strong bg-paper text-ink hover:border-ink/40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function chipLinkClass(selected?: boolean, className?: string) {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
    selected ? "border-forest bg-forest text-cream" : "border-line-strong bg-paper text-ink hover:border-ink/40",
    className,
  );
}
