import { Store, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { loginDemo } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { safeNext } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { MagicLinkForm } from "./magic-link-form";

export const metadata: Metadata = { title: copy.auth.title };

const t = copy.auth;

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const error = sp.erreur === "lien" ? t.invalid : sp.erreur === "seed" ? "Base vide : lance « npm run seed »." : null;
  const reason = sp.raison === "reserver" ? copy.booking.loginNeeded : sp.partenaire ? "Cet espace est réservé aux partenaires." : null;

  return (
    <main id="contenu" className="mx-auto flex min-h-[calc(100dvh-24px)] max-w-md flex-col px-5 py-8">
      <Link href="/" className="self-start" aria-label="Déniche, accueil">
        <Logo />
      </Link>

      <div className="mt-12">
        <h1 className="font-display text-4xl font-bold">{t.title}</h1>
        <p className="mt-2 text-ink-soft">{t.subtitle}</p>
      </div>

      {(error || reason) && (
        <p role="alert" className="mt-5 rounded-xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-ink">
          {error ?? reason}
        </p>
      )}

      <MagicLinkForm next={next} />

      <div className="my-8 flex items-center gap-3 text-sm text-ink-mute">
        <span className="h-px flex-1 bg-line" />
        {t.demoTitle}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-3">
        <form action={loginDemo}>
          <input type="hidden" name="role" value="user" />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={buttonClass({ variant: "forest", size: "lg", className: "w-full" })}>
            <UserRound aria-hidden className="size-5" />
            {t.demoUser}
          </button>
        </form>
        <form action={loginDemo}>
          <input type="hidden" name="role" value="partner" />
          <input type="hidden" name="next" value={next === "/" ? "/partenaire" : next} />
          <button type="submit" className={buttonClass({ variant: "outline", size: "lg", className: "w-full" })}>
            <Store aria-hidden className="size-5" />
            {t.demoPartner}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-ink-mute">Camille (démo) et Alex (démo) sont des comptes fictifs.</p>
    </main>
  );
}
