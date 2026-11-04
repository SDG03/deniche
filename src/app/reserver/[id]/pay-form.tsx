"use client";

import { CreditCard, Gift, Lock, Smartphone } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { payBooking, type PayState } from "@/app/actions/booking";
import { useNow } from "@/components/use-now";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatPrice } from "@/lib/format";

const t = copy.booking;

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PayForm({
  bookingId,
  people,
  firstName,
  totalCents,
  lockedUntil,
  restartHref,
  provider,
  perk,
}: {
  bookingId: string;
  people: number;
  firstName: string;
  totalCents: number;
  lockedUntil: string;
  restartHref: string;
  provider: "mock" | "stripe";
  /** cadeau fidélité disponible */
  perk?: string;
}) {
  const [state, action, pending] = useActionState<PayState, FormData>(payBooking, {});
  const [method, setMethod] = useState<"card" | "bancontact">("card");
  const now = useNow(1000);
  const remaining = now === null ? null : Date.parse(lockedUntil) - now;
  const expired = remaining !== null && remaining <= 0;
  const urgent = remaining !== null && remaining < 120_000;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="method" value={method} />

      {/* Verrou de prix */}
      <div
        role="timer"
        aria-live="off"
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 py-3",
          expired ? "border-danger/30 bg-coral-soft" : "border-forest/20 bg-forest-soft",
        )}
      >
        <Lock aria-hidden className={cn("size-5 shrink-0", expired ? "text-danger" : "text-forest")} />
        <div className="flex-1 text-sm">
          <div className="font-semibold">{expired ? t.lockExpired : t.lockTitle}</div>
          {!expired && (
            <div className="text-ink-soft">{t.lockBody(remaining === null ? "10:00" : mmss(remaining))}</div>
          )}
        </div>
        {!expired && (
          <span className={cn("tabular font-display text-2xl font-bold", urgent ? "text-coral-ink" : "text-forest")}>
            {remaining === null ? "10:00" : mmss(remaining)}
          </span>
        )}
      </div>

      {expired ? (
        <Link href={restartHref} className={buttonClass({ variant: "primary", size: "lg", className: "w-full" })}>
          {t.restart}
        </Link>
      ) : (
        <>
          <fieldset>
            <legend className="font-display text-xl font-bold">{t.participants}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: people }, (_, i) => (
                <label key={i} className="block">
                  <span className="text-xs font-semibold text-ink-mute">{t.participantLabel(i)}</span>
                  <input
                    name="names"
                    required
                    maxLength={40}
                    autoComplete={i === 0 ? "given-name" : "off"}
                    defaultValue={i === 0 ? firstName : ""}
                    placeholder={t.participantPlaceholder}
                    className="mt-1 h-12 w-full rounded-xl border border-line-strong bg-paper px-3.5 focus:border-forest focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">{t.payment}</legend>
            {provider === "stripe" ? (
              <p className="mt-3 rounded-2xl border border-line bg-paper p-4 text-sm text-ink-soft">
                {t.stripeRedirect}
              </p>
            ) : (
              <div className="mt-3 rounded-2xl border border-line bg-paper p-4">
                <div role="radiogroup" aria-label={t.method} className="grid grid-cols-2 gap-2">
                  {(["card", "bancontact"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={method === m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                        method === m ? "border-forest bg-forest-soft text-forest" : "border-line-strong",
                      )}
                    >
                      {m === "card" ? (
                        <CreditCard aria-hidden className="size-4" />
                      ) : (
                        <Smartphone aria-hidden className="size-4" />
                      )}
                      {t.mockMethods[m]}
                    </button>
                  ))}
                </div>
                {method === "card" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_88px_72px]">
                    <label className="col-span-2 block sm:col-span-1">
                      <span className="text-xs font-semibold text-ink-mute">{t.cardNumber}</span>
                      <input
                        name="cardNumber"
                        inputMode="numeric"
                        autoComplete="off"
                        defaultValue="4242 4242 4242 4242"
                        className="tabular mt-1 h-12 w-full rounded-xl border border-line-strong bg-cream px-3 focus:border-forest focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-ink-mute">{t.expiry}</span>
                      <input
                        defaultValue="12/30"
                        autoComplete="off"
                        className="tabular mt-1 h-12 w-full rounded-xl border border-line-strong bg-cream px-3 focus:border-forest focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-ink-mute">{t.cvc}</span>
                      <input
                        defaultValue="123"
                        autoComplete="off"
                        className="tabular mt-1 h-12 w-full rounded-xl border border-line-strong bg-cream px-3 focus:border-forest focus:outline-none"
                      />
                    </label>
                    <p className="col-span-2 text-xs text-ink-mute sm:col-span-3">
                      {t.mockCard}. {t.declinedHint}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink-soft">{t.bancontactMock}</p>
                )}
              </div>
            )}
          </fieldset>

          {perk && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-coral/40 bg-coral-soft/60 p-4">
              <input type="checkbox" name="useReward" defaultChecked className="mt-0.5 size-5 shrink-0 accent-forest" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Gift aria-hidden className="size-4 text-coral-ink" />
                  {copy.loyalty.useAtCheckout}
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">{copy.loyalty.useAtCheckoutHint(perk)}</span>
              </span>
            </label>
          )}

          {state.error && (
            <p role="alert" className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-ink">
              {state.error}
            </p>
          )}

          <div className="pb-safe sticky bottom-0 -mx-4 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass({ variant: "primary", size: "lg", className: "w-full" })}
            >
              <Lock aria-hidden className="size-4" />
              {pending ? t.paying : t.pay(formatPrice(totalCents))}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
