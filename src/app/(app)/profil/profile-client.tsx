"use client";

import { Download, LocateFixed, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocate } from "@/components/location-chip";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { POSITION_COOKIE } from "@/lib/geo";

const t = copy.profile;

export function PositionCard({ isDefault }: { isDefault: boolean }) {
  const router = useRouter();
  const { state, locate } = useLocate();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <span className="grid size-11 place-items-center rounded-full bg-forest-soft text-forest">
        {isDefault ? <MapPin aria-hidden className="size-5" /> : <LocateFixed aria-hidden className="size-5" />}
      </span>
      <div className="min-w-[11rem] flex-1">
        <div className="text-xs font-medium text-ink-mute">{t.position}</div>
        <div className="font-semibold">{isDefault ? t.locationDefault : t.locationMine}</div>
        {state === "denied" && <div className="text-xs text-danger">{t.locationDenied}</div>}
      </div>
      {isDefault ? (
        <Button variant="soft" size="sm" onClick={locate} disabled={state === "locating"}>
          {state === "locating" ? t.locating : t.useLocation}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            document.cookie = `${POSITION_COOKIE}=; path=/; max-age=0`;
            router.refresh();
          }}
        >
          {t.backToLiege}
        </Button>
      )}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Bouton « Installer l'appli » (Chrome/Android/desktop) ; aide manuelle sur iOS. */
export function InstallButton() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(/iPhone|iPad/.test(navigator.userAgent) && !("standalone" in navigator && navigator.standalone));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (event)
    return (
      <Button variant="outline" size="sm" onClick={() => event.prompt()}>
        <Download aria-hidden className="size-4" />
        {t.install}
      </Button>
    );
  if (ios) return <p className="text-sm text-ink-mute">{t.iosInstall}</p>;
  return <p className="text-sm text-ink-mute">{t.otherInstall}</p>;
}
