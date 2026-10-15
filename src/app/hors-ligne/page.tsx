import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata = { title: "Hors ligne" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main id="contenu" className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <div className="mt-10 grid size-16 place-items-center rounded-full bg-forest-soft text-forest">
        <WifiOff aria-hidden className="size-8" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold">Pas de réseau</h1>
      <p className="mt-2 text-ink-soft">
        Les prix changent à la minute, on préfère ne rien t&apos;afficher de périmé. Reviens dès que tu captes.
      </p>
      <p className="mt-4 text-sm text-ink-mute">Astuce : ton code d&apos;arrivée est aussi dans l&apos;e-mail de confirmation.</p>
    </main>
  );
}
