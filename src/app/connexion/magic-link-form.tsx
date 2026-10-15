"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import { requestMagicLink } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, null);
  return (
    <form action={action} className="mt-8" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-sm font-semibold">
        {copy.auth.email}
      </label>
      <div className="relative mt-2">
        <Mail
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-mute"
        />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={copy.auth.placeholder}
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "email-error" : undefined}
          className="h-13 w-full rounded-2xl border border-line-strong bg-paper pr-4 pl-12 text-base focus:border-forest focus:outline-none"
        />
      </div>
      {state?.error && (
        <p id="email-error" className="mt-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ variant: "primary", size: "lg", className: "mt-4 w-full" })}
      >
        {pending ? copy.auth.sending : copy.auth.send}
      </button>
    </form>
  );
}
