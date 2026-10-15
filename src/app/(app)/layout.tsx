import Link from "next/link";
import { TabBar, TopNav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { copy } from "@/lib/copy";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <TopNav isPartner={user?.role === "PARTNER"} />
      <main id="contenu" className="pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)] md:pb-16">
        {children}
      </main>
      <footer className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-6 text-sm text-ink-mute">
          <span>{copy.footer.credit}</span>
          <Link href="/legal/cgv" className="hover:text-ink">
            {copy.footer.cgv}
          </Link>
          <Link href="/legal/confidentialite" className="hover:text-ink">
            {copy.footer.privacy}
          </Link>
          <Link href="/legal/annulation" className="hover:text-ink">
            {copy.footer.cancellation}
          </Link>
          <Link href="/partenaire" className="ml-auto font-medium text-forest hover:underline">
            {copy.nav.partner}
          </Link>
        </div>
      </footer>
      <TabBar />
    </>
  );
}
