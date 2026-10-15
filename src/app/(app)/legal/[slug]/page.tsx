import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileHeader } from "@/components/page-header";
import { copy } from "@/lib/copy";
import { LEGAL_DOCS } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  return { title: doc?.title ?? "Informations légales" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  if (!doc) notFound();
  return (
    <div>
      <MobileHeader back="/profil" title={doc.title} />
      <article className="mx-auto max-w-2xl px-4 pt-6 md:pt-12">
        <p role="note" className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {copy.legal.toValidate}
        </p>
        <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-lg text-ink-soft">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="font-display text-xl font-bold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
        <nav aria-label="Autres documents" className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6 text-sm">
          {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
            <Link key={d.slug} href={`/legal/${d.slug}`} className="font-semibold text-forest underline-offset-4 hover:underline">
              {d.title}
            </Link>
          ))}
        </nav>
      </article>
    </div>
  );
}
