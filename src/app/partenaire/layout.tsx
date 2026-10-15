import { ArrowUpRight, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { LogoMark } from "@/components/logo";
import { requirePartner } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { PartnerNav } from "./partner-nav";

export const metadata: Metadata = { title: { default: copy.partner.title, template: `%s · Partenaire · Déniche` }, robots: { index: false } };

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, partnerId } = await requirePartner();
  const partner = await db.partner.findUniqueOrThrow({ where: { id: partnerId } });
  return (
    <>
      <header className="bg-forest text-cream">
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-3 md:px-6 md:pt-5">
          <div className="flex items-center gap-3">
            <Link href="/partenaire" aria-label="Espace partenaire, tableau de bord">
              <LogoMark className="size-9 [&>rect]:fill-cream [&>path]:fill-forest" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="text-2xs font-semibold tracking-wide text-cream/70 uppercase">{copy.partner.title}</div>
              <div className="truncate font-display text-lg font-bold">{partner.name}</div>
            </div>
            <Link
              href="/"
              className="hidden min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-cream/80 hover:bg-cream/10 hover:text-cream sm:inline-flex"
            >
              Voir l&apos;appli <ArrowUpRight aria-hidden className="size-4" />
            </Link>
            <form action={logout}>
              <button type="submit" aria-label={`${copy.auth.logout} (${user.name})`} className="grid size-11 place-items-center rounded-full hover:bg-cream/10">
                <LogOut aria-hidden className="size-5" />
              </button>
            </form>
          </div>
          <div className="mt-3">
            <PartnerNav />
          </div>
        </div>
      </header>
      <main id="contenu" className="mx-auto max-w-6xl px-4 pt-6 pb-16 md:px-6 md:pt-8">
        {children}
      </main>
    </>
  );
}
