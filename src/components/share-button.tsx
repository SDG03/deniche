"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

/** Partage natif (mobile) avec repli « copier le lien ». */
export function ShareButton({
  path,
  title,
  text,
  label = copy.confirmation.share,
  variant = "forest",
  className,
}: {
  path: string;
  title: string;
  text: string;
  label?: string;
  variant?: "forest" | "outline" | "primary";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(path, location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* partage annulé */
    }
  };
  return (
    <button type="button" onClick={share} className={buttonClass({ variant, className })}>
      {copied ? <Check aria-hidden className="size-4" /> : <Share2 aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? copy.confirmation.copied : label}</span>
    </button>
  );
}
