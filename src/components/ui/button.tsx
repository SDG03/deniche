import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "forest" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,transform,box-shadow,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  // Corail : réservé aux CTA principaux
  primary:
    "bg-coral text-ink hover:bg-[#ff6c4c] shadow-[0_1px_0_rgb(20_32_27/0.12)] disabled:bg-sand disabled:text-ink-mute disabled:opacity-100 disabled:shadow-none",
  forest: "bg-forest text-cream hover:bg-[#28503d]",
  outline: "border border-line-strong bg-paper text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-ink/5",
  soft: "bg-forest-soft text-forest hover:bg-[#d9e3dd]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-[0.9375rem]",
  lg: "min-h-14 px-6 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
