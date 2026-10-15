"use client";

import { Info, Minus, Plus, Share2, TrendingDown, Users } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startCheckout, type CheckoutState } from "@/app/actions/booking";
import { useNow } from "@/components/use-now";
import { DiscountBadge, PriceTag } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import type { SlotView } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { dayKey, formatDuration, formatPrice, formatTime, inBrussels } from "@/lib/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const t = copy.activity;

export function SlotPicker({
  activity,
  slots,
  days,
  initialSlotId,
  headingId = "creneaux",
}: {
  activity: { slug: string; title: string; minPeople: number; maxPeople: number };
  slots: SlotView[];
  days: string[];
  initialSlotId?: string;
  headingId?: string;
}) {
  const router = useRouter();
  const now = useNow(15_000);
  const byDay = useMemo(() => {
    const m = new Map<string, SlotView[]>();
    for (const s of slots) {
      const k = dayKey(s.startsAt);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots]);

  const initial = slots.find((s) => s.id === initialSlotId && s.bookable) ?? null;
  const firstBookableDay = days.find((d) => byDay.get(d)?.some((s) => s.bookable)) ?? days[0];
  const [day, setDay] = useState(initial ? dayKey(initial.startsAt) : firstBookableDay);
  const [slotId, setSlotId] = useState<string | null>(initial?.id ?? null);
  const [peopleWanted, setPeople] = useState(Math.max(1, activity.minPeople));
  const [shared, setShared] = useState(false);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  const slot = slots.find((s) => s.id === slotId) ?? null;
  const daySlots = byDay.get(day) ?? [];
  const maxPeople = Math.max(activity.minPeople, Math.min(activity.maxPeople, slot?.seatsLeft ?? activity.maxPeople));

  const people = Math.min(peopleWanted, maxPeople);

  // Quand un palier tombe, on redemande les prix au serveur.
  useEffect(() => {
    if (!now) return;
    const due = slots.some((s) => s.nextChangeAt && Date.parse(s.nextChangeAt) <= now);
    if (due) router.refresh();
  }, [now, slots, router]);

  const discounted = slot && slot.discountPct > 0 ? Math.min(people, slot.discountedSeatsLeft ?? people) : 0;
  const total = slot ? discounted * slot.unitPriceCents + (people - discounted) * slot.basePriceCents : 0;
  const countdown =
    slot?.nextChangeAt && now && slot.nextDiscountPct !== null && slot.nextDiscountPct > slot.discountPct
      ? t.nextTier(slot.nextDiscountPct, formatDuration(Date.parse(slot.nextChangeAt) - now))
      : null;

  const share = async () => {
    if (!slot) return;
    const url = `${location.origin}/activite/${activity.slug}?creneau=${slot.id}`;
    const text = copy.confirmation.shareText(
      activity.title,
      t.onDate(format(inBrussels(slot.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })),
    );
    try {
      if (navigator.share) await navigator.share({ title: activity.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <div>
      <h2 id={headingId} className="font-display text-[1.375rem] font-bold">
        {t.slotsTitle}
      </h2>

      {/* Jours */}
      <div
        role="tablist"
        aria-label={t.daysLabel}
        className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-5 md:px-5"
      >
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const open = list.some((s) => s.bookable);
          const best = Math.max(0, ...list.filter((s) => s.bookable).map((s) => s.discountPct));
          const date = inBrussels(`${d}T12:00:00`);
          const selected = d === day;
          return (
            <button
              key={d}
              role="tab"
              type="button"
              aria-selected={selected}
              disabled={!open}
              onClick={() => {
                setDay(d);
                setSlotId(null);
              }}
              className={cn(
                "relative flex min-h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-center transition-colors duration-150",
                selected ? "border-forest bg-forest text-cream" : "border-line bg-paper hover:border-ink/40",
                !open && "opacity-40",
              )}
            >
              <span className={cn("text-2xs font-medium uppercase", selected ? "text-cream/80" : "text-ink-mute")}>
                {format(date, "EEE", { locale: fr }).replace(".", "")}
              </span>
              <span className="tabular font-display text-lg leading-tight font-bold">{format(date, "d")}</span>
              {best > 0 && (
                <span aria-label={t.upTo(best)} className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-coral" />
              )}
            </button>
          );
        })}
      </div>

      {/* Créneaux du jour */}
      <div className="mt-4">
        {daySlots.length === 0 ? (
          <p className="rounded-xl bg-cream-deep px-4 py-3 text-sm text-ink-mute">{t.noSlotsDay}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3" aria-label={t.slotsLabel}>
            {daySlots.map((s) => {
              const selected = s.id === slotId;
              const status = s.seatsLeft === 0 ? t.full : !s.bookable ? t.closed : null;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!s.bookable}
                    aria-pressed={selected}
                    onClick={() => setSlotId(s.id)}
                    className={cn(
                      "relative flex w-full flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150",
                      selected
                        ? "border-forest bg-forest-soft shadow-[inset_0_0_0_1px_var(--forest)]"
                        : "border-line bg-paper hover:border-ink/40",
                      !s.bookable && "cursor-not-allowed bg-cream-deep",
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="tabular font-display text-lg font-bold">{formatTime(s.startsAt)}</span>
                      {s.bookable && <DiscountBadge pct={s.discountPct} size="sm" />}
                    </span>
                    {status ? (
                      <span className="mt-1 text-sm font-medium text-ink-mute">{status}</span>
                    ) : (
                      <>
                        <PriceTag
                          baseCents={s.basePriceCents}
                          currentCents={s.unitPriceCents}
                          size="sm"
                          className="mt-0.5"
                        />
                        <span
                          className={cn(
                            "mt-0.5 text-xs",
                            s.seatsLeft <= 3 ? "font-semibold text-coral-ink" : "text-ink-mute",
                          )}
                        >
                          {t.placesLeft(s.seatsLeft)}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Détail du créneau choisi */}
      {slot && (
        <div className="mt-4 animate-fade-up rounded-2xl border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">{slot.tierLabel}</span>
            {countdown && (
              <span className="tabular inline-flex items-center gap-1 font-semibold text-coral-ink">
                <TrendingDown aria-hidden className="size-4" />
                {countdown}
              </span>
            )}
          </div>
          <p className="mt-1.5 flex gap-1.5 text-xs text-ink-mute">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            {t.pricingHonest}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Users aria-hidden className="size-4 text-ink-mute" />
              {t.people}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={copy.common.lessPerson}
                disabled={people <= Math.max(1, activity.minPeople)}
                onClick={() => setPeople(people - 1)}
                className="grid size-11 place-items-center rounded-full border border-line-strong bg-paper disabled:opacity-40"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <span className="tabular w-6 text-center text-lg font-semibold" aria-live="polite">
                {people}
              </span>
              <button
                type="button"
                aria-label={copy.common.morePerson}
                disabled={people >= maxPeople}
                onClick={() => setPeople(people + 1)}
                className="grid size-11 place-items-center rounded-full border border-line-strong bg-paper disabled:opacity-40"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
          </div>
          {discounted < people && slot.discountPct > 0 && (
            <p className="mt-2 text-xs text-ink-mute">{copy.booking.quotaNote}</p>
          )}

          <button
            type="button"
            onClick={share}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest"
          >
            <Share2 aria-hidden className="size-4" />
            {shared ? copy.confirmation.copied : t.share}
          </button>
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-ink">
          {state.error}
        </p>
      )}

      {/* CTA collant : barre en bas sur mobile, dans la carte sur desktop */}
      <form
        action={action}
        className="pb-safe fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
      >
        <input type="hidden" name="slotId" value={slot?.id ?? ""} />
        <input type="hidden" name="people" value={people} />
        <input type="hidden" name="slug" value={activity.slug} />
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            {slot ? (
              <>
                <div className="tabular font-display text-xl leading-tight font-bold">{formatPrice(total)}</div>
                <div className="truncate text-xs text-ink-mute">
                  {people} pers. · {format(inBrussels(slot.startsAt), "EEE d MMM, HH:mm", { locale: fr })}
                </div>
              </>
            ) : (
              <div className="text-sm text-ink-mute">{t.ctaPick}</div>
            )}
          </div>
          <button
            type="submit"
            disabled={!slot || pending}
            className={buttonClass({ variant: "primary", size: "lg", className: "min-w-36" })}
          >
            {pending ? "…" : t.ctaBook}
          </button>
        </div>
      </form>
    </div>
  );
}
