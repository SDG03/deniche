"use client";

import { CheckCircle2, CircleAlert, Camera, CameraOff, Search, Users } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { lookupCheckin, type CheckinResult } from "@/app/actions/partner";
import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatSlotWhen } from "@/lib/format";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export function Checkin() {
  const [state, action, pending] = useActionState<CheckinResult, FormData>(lookupCheckin, { status: "idle" });
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // Scan QR via BarcodeDetector (Chrome Android, Edge…). Repli : saisie du code.
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      if (!BD) {
        setScanError("Ce navigateur ne sait pas lire les QR codes. Saisis le code à 6 caractères.");
        setScanning(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setScanError("Caméra indisponible ou refusée. Saisis le code à la main.");
        setScanning(false);
        return;
      }
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      const detector = new BD({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopped) return;
        const found = await detector.detect(v).catch(() => []);
        if (found[0]?.rawValue) {
          setCode(found[0].rawValue);
          setScanning(false);
          requestAnimationFrame(() => form.current?.requestSubmit());
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  const b = state.booking;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <form ref={form} action={action} className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <label htmlFor="code" className="text-sm font-semibold">
            Code d&apos;arrivée ou référence
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ex. 6HQMGP"
              className="tabular h-13 min-w-0 flex-1 rounded-xl border border-line-strong bg-cream px-4 font-display text-xl font-bold tracking-[0.15em] uppercase placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:border-forest focus:outline-none"
            />
            <button type="submit" disabled={pending} aria-label="Chercher" className={buttonClass({ variant: "forest", size: "lg", className: "px-4" })}>
              <Search aria-hidden className="size-5" />
            </button>
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={() => (setScanError(null), setScanning((s) => !s))}>
            {scanning ? <CameraOff aria-hidden className="size-4" /> : <Camera aria-hidden className="size-4" />}
            {scanning ? "Arrêter le scan" : "Scanner le QR code"}
          </Button>
          {scanError && <p className="mt-2 text-sm text-danger">{scanError}</p>}
          {scanning && (
            <video ref={video} muted playsInline className="mt-3 aspect-square w-full rounded-xl bg-ink object-cover" aria-label="Aperçu caméra" />
          )}
        </form>
      </div>

      <div aria-live="polite">
        {state.status === "idle" && (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-sm text-ink-mute">
            Le client montre son QR code ou te dicte son code à 6 caractères. Tu vois tout de suite si la réservation est valide.
          </p>
        )}
        {state.status === "not_found" && (
          <Result tone="danger" icon={<CircleAlert className="size-6" />} title="Aucune réservation trouvée" body="Vérifie le code : il ne contient ni 0, ni O, ni 1, ni I." />
        )}
        {b && state.status !== "not_found" && (
          <div
            className={cn(
              "animate-fade-up rounded-[var(--radius-card)] border p-5",
              state.status === "checked" ? "border-forest bg-forest text-cream" : "border-line bg-paper",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {state.status === "checked" ? (
                <>
                  <CheckCircle2 aria-hidden className="size-5" /> Arrivée validée. Bon moment !
                </>
              ) : state.status === "already" ? (
                <span className="text-forest">Déjà validée</span>
              ) : state.status === "cancelled" ? (
                <span className="text-danger">Réservation annulée</span>
              ) : (
                <span className="text-forest">Réservation valide</span>
              )}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{b.name}</div>
            <div className={cn("text-sm", state.status === "checked" ? "text-cream/80" : "text-ink-soft")}>
              {b.activity} · <span className="first-letter:uppercase">{formatSlotWhen(b.startsAt)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Users aria-hidden className="size-4" />
              {b.people} pers.{b.names.length ? ` : ${b.names.join(", ")}` : ""}
            </div>
            <div className="tabular mt-1 text-xs opacity-70">{b.reference}</div>
            {state.status === "found" && (
              <form action={action} className="mt-4">
                <input type="hidden" name="confirm" value={b.id} />
                <button type="submit" disabled={pending} className={buttonClass({ variant: "forest", size: "lg", className: "w-full" })}>
                  <CheckCircle2 aria-hidden className="size-5" />
                  Valider l&apos;arrivée
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Result({ tone, icon, title, body }: { tone: "danger"; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={cn("animate-fade-up flex gap-3 rounded-[var(--radius-card)] border p-5", tone === "danger" && "border-danger/30 bg-coral-soft")}>
      <span className="text-danger">{icon}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
