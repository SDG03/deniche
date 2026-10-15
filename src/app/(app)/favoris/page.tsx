import { Heart, LogIn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityCard } from "@/components/activity-card";
import { PageTitle } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { getFavoriteIds } from "@/lib/favorites";

export const metadata: Metadata = { title: copy.favorites.title };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const content = await (async () => {
    if (!user)
      return (
        <EmptyState
          icon={<LogIn className="size-6" />}
          title={copy.profile.guest}
          body={copy.profile.guestBody}
          action={
            <Link href="/connexion?next=/favoris" className={buttonClass({ variant: "forest", size: "sm" })}>
              {copy.auth.title}
            </Link>
          }
        />
      );
    const [favorites, catalog] = await Promise.all([getFavoriteIds(), getCatalog({ now })]);
    const list = catalog.filter((a) => favorites.has(a.id)).sort((a, b) => a.distanceKm - b.distanceKm);
    if (!list.length)
      return (
        <EmptyState
          icon={<Heart className="size-6" />}
          title={copy.favorites.emptyTitle}
          body={copy.favorites.emptyBody}
          action={
            <Link href="/explorer" className={buttonClass({ variant: "primary", size: "sm" })}>
              {copy.nav.explore}
            </Link>
          }
        />
      );
    return (
      <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => (
          <li key={a.id}>
            <ActivityCard activity={a} isFavorite now={now} />
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
      <PageTitle title={copy.favorites.title} />
      {content}
    </div>
  );
}
