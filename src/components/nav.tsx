"use client";

import { CalendarCheck, Compass, Heart, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { Logo } from "./logo";

const TABS = [
  { href: "/", label: copy.nav.home, icon: House },
  { href: "/explorer", label: copy.nav.explore, icon: Compass },
  { href: "/favoris", label: copy.nav.favorites, icon: Heart },
  { href: "/reservations", label: copy.nav.bookings, icon: CalendarCheck },
  { href: "/profil", label: copy.nav.profile, icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Barre d'onglets mobile (bas d'écran). */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={copy.common.mainNav}
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-md items-stretch justify-around px-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors duration-150",
                  active ? "text-forest" : "text-ink-mute hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[22px]"
                  strokeWidth={active ? 2.25 : 1.75}
                  fill={active && href === "/favoris" ? "currentColor" : "none"}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** En-tête desktop (≥ md). */
export function TopNav({ isPartner }: { isPartner?: boolean }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-cream/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Link href="/" aria-label={copy.common.homeLink} className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label={copy.common.mainNav} className="flex flex-1 items-center gap-1">
          {TABS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150",
                  active ? "bg-forest text-cream" : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        {isPartner && (
          <Link href="/partenaire" className="text-sm font-semibold text-forest underline-offset-4 hover:underline">
            {copy.nav.partner}
          </Link>
        )}
      </div>
    </header>
  );
}
