import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

const t = copy.auth;

/** Page de démonstration : affiche l'e-mail qui aurait été envoyé. */
export default async function SentPage({ searchParams }: PageProps<"/connexion/envoye">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const link = typeof sp.lien === "string" && sp.lien.startsWith("/connexion/verifier?") ? sp.lien : "/connexion";

  return (
    <main id="contenu" className="mx-auto max-w-md px-5 py-8">
      <Link href="/" aria-label="Déniche, accueil">
        <Logo />
      </Link>
      <div className="mt-12 grid size-14 place-items-center rounded-full bg-forest-soft text-forest">
        <MailCheck aria-hidden className="size-7" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold">{t.sentTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.sentBody}</p>

      <article className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
        <div className="border-b border-line bg-cream-deep px-4 py-3 text-xs text-ink-mute">
          <div>
            <span className="font-semibold text-ink">De :</span> Déniche &lt;bonjour@deniche.be&gt;
          </div>
          <div>
            <span className="font-semibold text-ink">À :</span> {email}
          </div>
          <div>
            <span className="font-semibold text-ink">Objet :</span> Ton lien de connexion Déniche
          </div>
        </div>
        <div className="px-4 py-5 text-sm text-ink-soft">
          <p>Salut,</p>
          <p className="mt-2">Voici ton lien pour te connecter. Il est valable 15 minutes et ne sert qu&apos;une fois.</p>
          <a href={link} className={buttonClass({ variant: "primary", size: "md", className: "mt-4" })}>
            {t.open}
          </a>
          <p className="mt-4 text-xs text-ink-mute">Tu n&apos;as rien demandé ? Ignore ce message, rien ne se passera.</p>
        </div>
      </article>
    </main>
  );
}
