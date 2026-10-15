import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "./logo";
import { copy } from "@/lib/copy";

/** En-tête mobile des pages internes (masqué sur desktop où TopNav prend le relais). */
export function MobileHeader({ title, back, action }: { title?: string; back?: string; action?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-cream/90 px-2 backdrop-blur md:hidden">
      {back ? (
        <Link
          href={back}
          aria-label={copy.common.back}
          className="grid size-11 place-items-center rounded-full hover:bg-ink/5"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
      ) : (
        <Link href="/" aria-label={copy.common.homeLink} className="grid size-11 place-items-center">
          <LogoMark className="size-7" />
        </Link>
      )}
      {title && <span className="flex-1 truncate font-display text-lg font-bold">{title}</span>}
      {action}
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl leading-tight font-bold md:text-4xl">{title}</h1>
      {sub && <p className="mt-1 text-ink-mute">{sub}</p>}
    </div>
  );
}
