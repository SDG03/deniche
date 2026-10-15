"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { POSITION_COOKIE } from "@/lib/geo";

export function useLocate() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "denied">("idle");
  const locate = () => {
    if (!("geolocation" in navigator)) return setState("denied");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        document.cookie = `${POSITION_COOKIE}=${encodeURIComponent(v)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
        setState("idle");
        router.refresh();
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  };
  return { state, locate };
}

/** Petite pastille « où suis-je » : touche pour utiliser la géolocalisation. */
export function LocationChip({ isDefault, className }: { isDefault: boolean; className?: string }) {
  const { state, locate } = useLocate();
  const label =
    state === "locating"
      ? copy.profile.locating
      : state === "denied"
        ? "Liège centre"
        : isDefault
          ? "Liège centre"
          : "Autour de toi";
  return (
    <button
      type="button"
      onClick={locate}
      title={isDefault ? copy.profile.useLocation : undefined}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3.5 text-sm font-medium text-ink hover:border-ink/40",
        className,
      )}
    >
      {isDefault ? <MapPin aria-hidden className="size-4 text-forest" /> : <LocateFixed aria-hidden className="size-4 text-forest" />}
      <span>{label}</span>
      <span className="sr-only">— {copy.profile.useLocation}</span>
    </button>
  );
}
