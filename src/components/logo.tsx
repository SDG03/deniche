import { cn } from "@/lib/cn";

/** Logotype : un pin de carte évidé en loupe + le mot-symbole. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#1F3D2F" />
      <path
        d="M16 6.5c-4.4 0-7.5 3.2-7.5 7.3 0 5.3 6 10.6 7 11.5.3.3.7.3 1 0 1-.9 7-6.2 7-11.5 0-4.1-3.1-7.3-7.5-7.3Z"
        fill="#FAF7F2"
      />
      <circle cx="16" cy="13.8" r="3" fill="#FF5A36" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight text-forest">Déniche</span>
    </span>
  );
}
