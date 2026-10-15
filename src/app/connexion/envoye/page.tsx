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
      <Link href="/" aria-label={copy.common.homeLink}>
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
            <span className="font-semibold text-ink">{t.mail.from}</span> {t.mail.fromValue}
          </div>
          <div>
            <span className="font-semibold text-ink">{t.mail.to}</span> {email}
          </div>
          <div>
            <span className="font-semibold text-ink">{t.mail.subjectLabel}</span> {t.mail.subject}
          </div>
        </div>
        <div className="px-4 py-5 text-sm text-ink-soft">
          <p>{t.mail.hello}</p>
          <p className="mt-2">{t.mail.body}</p>
          <a href={link} className={buttonClass({ variant: "primary", size: "md", className: "mt-4" })}>
            {t.open}
          </a>
          <p className="mt-4 text-xs text-ink-mute">{t.mail.ignore}</p>
        </div>
      </article>
    </main>
  );
}
