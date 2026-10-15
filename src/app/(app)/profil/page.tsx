import { ChevronRight, FileText, LogOut, Store, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { PageTitle } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getUserPosition } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { InstallButton, PositionCard } from "./profile-client";

export const metadata: Metadata = { title: copy.profile.title };

const t = copy.profile;

const LEGAL = [
  { href: "/legal/cgv", label: copy.legalPages.cgv },
  { href: "/legal/confidentialite", label: copy.legalPages.privacy },
  { href: "/legal/annulation", label: copy.legalPages.cancellation },
];

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const { isDefault } = await getUserPosition();
  const stats = user
    ? await db.booking.count({ where: { userId: user.id, status: { in: ["CONFIRMED", "CHECKED_IN"] } } })
    : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
      <PageTitle title={t.title} />

      {user ? (
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-forest p-5 text-cream">
          <span className="grid size-14 place-items-center rounded-full bg-cream font-display text-2xl font-bold text-forest">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="font-display text-xl font-bold">{t.hello(user.name.replace(/\s*\(démo\)$/, ""))}</div>
            <div className="truncate text-sm text-cream/75">{user.email}</div>
            <div className="mt-1 text-sm text-cream/90">{t.outings(stats)}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <div className="font-display text-xl font-bold">{t.guest}</div>
          <p className="mt-1 text-sm text-ink-soft">{t.guestBody}</p>
          <Link
            href="/connexion?next=/profil"
            className={buttonClass({ variant: "primary", size: "sm", className: "mt-4" })}
          >
            {copy.auth.title}
          </Link>
        </div>
      )}

      <section className="mt-6 space-y-3">
        <PositionCard isDefault={isDefault} />
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <span className="grid size-11 place-items-center rounded-full bg-forest-soft text-forest">
            <Smartphone aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{t.install}</div>
            <InstallButton />
          </div>
        </div>
      </section>

      <nav
        aria-label={copy.common.links}
        className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper"
      >
        <ul className="divide-y divide-line">
          {user?.role === "PARTNER" && (
            <li>
              <Link
                href="/partenaire"
                className="flex min-h-14 items-center gap-3 px-4 font-semibold text-forest hover:bg-cream"
              >
                <Store aria-hidden className="size-5" />
                <span className="flex-1">{copy.nav.partner}</span>
                <ChevronRight aria-hidden className="size-5" />
              </Link>
            </li>
          )}
          {LEGAL.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-cream">
                <FileText aria-hidden className="size-5 text-ink-mute" />
                <span className="flex-1">{l.label}</span>
                <ChevronRight aria-hidden className="size-5 text-ink-mute" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <form action={logout} className="mt-6">
          <button type="submit" className={buttonClass({ variant: "ghost", className: "text-ink-soft" })}>
            <LogOut aria-hidden className="size-4" />
            {copy.auth.logout}
          </button>
        </form>
      )}
      <p className="mt-8 text-xs text-ink-mute">{t.disclaimer}</p>
    </div>
  );
}
