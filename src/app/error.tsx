"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="contenu" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold">{copy.states.error}</h1>
      <p className="mt-2 text-ink-soft">{copy.states.errorBody}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="forest" onClick={reset}>
          <RotateCcw aria-hidden className="size-4" />
          {copy.states.retry}
        </Button>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          {copy.states.home}
        </Link>
      </div>
    </main>
  );
}
