"use client";

import { CalendarRange, LayoutDashboard, ListChecks, ScanLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

const ITEMS = [
  { href: "/partenaire", label: copy.partner.dashboard, icon: LayoutDashboard },
  { href: "/partenaire/activites", label: copy.partner.activities, icon: CalendarRange },
  { href: "/partenaire/reservations", label: copy.partner.bookings, icon: ListChecks },
  { href: "/partenaire/accueil", label: copy.partner.checkin, icon: ScanLine },
];

export function PartnerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace partenaire" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/partenaire" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              active ? "bg-cream text-forest" : "text-cream/80 hover:bg-cream/10 hover:text-cream",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
