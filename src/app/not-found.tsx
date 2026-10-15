import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <Logo />
      <div className="mt-10 grid size-16 place-items-center rounded-full bg-forest-soft text-forest">
        <Compass aria-hidden className="size-8" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold">{copy.states.notFound}</h1>
      <p className="mt-2 text-ink-soft">{copy.states.notFoundBody}</p>
      <Link href="/" className={buttonClass({ variant: "forest", className: "mt-6" })}>
        {copy.states.home}
      </Link>
    </main>
  );
}
