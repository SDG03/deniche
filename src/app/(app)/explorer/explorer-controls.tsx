"use client";

import { List, Map as MapIcon, Minus, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

const t = copy.explore;
const DISTANCES = [10, 25, 40, 60];
const BUDGETS = [20, 30, 45, 65];

type Draft = {
  categorie?: string;
  quand?: string;
  date?: string;
  personnes?: string;
  budget?: string;
  distance?: string;
  cadre?: string;
};
const KEYS: (keyof Draft)[] = ["categorie", "quand", "date", "personnes", "budget", "distance", "cadre"];

export function ExplorerControls({
  view,
  activeCount,
  resultCount,
  today,
}: {
  view: "liste" | "carte";
  activeCount: number;
  resultCount: number;
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [draft, setDraft] = useState<Draft>({});

  const push = (next: URLSearchParams) =>
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  };

  // Recherche avec un léger délai
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => setParam("q", q.trim() || undefined), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openSheet = () => {
    const d: Draft = {};
    for (const k of KEYS) d[k] = params.get(k) ?? undefined;
    setDraft(d);
    setOpen(true);
  };

  const applyDraft = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of KEYS) {
      const v = draft[k];
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (draft.quand !== "date") next.delete("date");
    push(next);
    setOpen(false);
  };

  const toggle = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: d[k] === v ? undefined : v }));
  const people = Number(draft.personnes ?? 1);
  const sort = params.get("tri") ?? "distance";

  return (
    <div className={cn("transition-opacity duration-150", pending && "opacity-70")}>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t.searchLabel}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-mute" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-12 w-full rounded-full border border-line-strong bg-paper pr-4 pl-11 text-[0.9375rem] placeholder:text-ink-mute focus:border-forest focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={openSheet}
          className="relative inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 text-sm font-semibold hover:border-ink/40"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal aria-hidden className="size-5" />
          <span className="hidden sm:inline">{t.filters}</span>
          {activeCount > 0 && (
            <span className="tabular grid size-5 place-items-center rounded-full bg-forest text-2xs text-cream">
              {activeCount}
              <span className="sr-only"> filtres actifs</span>
            </span>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip selected={params.get("quand") === "today"} onClick={() => setParam("quand", params.get("quand") === "today" ? undefined : "today")}>
            {copy.home.quickWhen.today}
          </Chip>
          <Chip
            selected={params.get("quand") === "tomorrow"}
            onClick={() => setParam("quand", params.get("quand") === "tomorrow" ? undefined : "tomorrow")}
          >
            {copy.home.quickWhen.tomorrow}
          </Chip>
          <Chip
            selected={params.get("quand") === "weekend"}
            onClick={() => setParam("quand", params.get("quand") === "weekend" ? undefined : "weekend")}
          >
            {copy.home.quickWhen.weekend}
          </Chip>
          <Chip selected={params.get("cadre") === "INDOOR"} onClick={() => setParam("cadre", params.get("cadre") === "INDOOR" ? undefined : "INDOOR")}>
            {t.filter.settings.INDOOR}
          </Chip>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-mute" aria-live="polite">
          {t.results(resultCount)}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <span className="sr-only md:not-sr-only md:text-ink-mute">{t.sortLabel}</span>
            <select
              value={sort}
              onChange={(e) => setParam("tri", e.target.value === "distance" ? undefined : e.target.value)}
              className="h-11 rounded-full border border-line-strong bg-paper px-3 text-sm font-medium focus:border-forest focus:outline-none"
              aria-label={t.sortLabel}
            >
              <option value="distance">{t.sort.distance}</option>
              <option value="price">{t.sort.price}</option>
              <option value="next">{t.sort.next}</option>
            </select>
          </label>
          <div role="group" aria-label="Affichage" className="flex rounded-full border border-line-strong bg-paper p-0.5">
            <button
              type="button"
              aria-pressed={view === "liste"}
              onClick={() => setParam("vue", undefined)}
              className={cn(
                "grid h-10 w-11 place-items-center rounded-full transition-colors",
                view === "liste" ? "bg-forest text-cream" : "text-ink-soft",
              )}
            >
              <List aria-hidden className="size-5" />
              <span className="sr-only">{t.list}</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "carte"}
              onClick={() => setParam("vue", "carte")}
              className={cn(
                "grid h-10 w-11 place-items-center rounded-full transition-colors",
                view === "carte" ? "bg-forest text-cream" : "text-ink-soft",
              )}
            >
              <MapIcon aria-hidden className="size-5" />
              <span className="sr-only">{t.map}</span>
            </button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.filters}
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDraft({})} className="flex-none">
              <X aria-hidden className="size-4" />
              {t.reset}
            </Button>
            <Button variant="forest" className="flex-1" onClick={applyDraft}>
              {t.applyFilters}
            </Button>
          </div>
        }
      >
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.filter.category}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.slug} selected={draft.categorie === c.slug} onClick={() => toggle("categorie", c.slug)}>
                <CategoryIcon slug={c.slug} className="size-4" />
                {c.short}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t.filter.when}</legend>
          <div className="flex flex-wrap gap-2">
            {(["today", "tomorrow", "weekend"] as const).map((w) => (
              <Chip key={w} selected={draft.quand === w} onClick={() => toggle("quand", w)}>
                {copy.home.quickWhen[w]}
              </Chip>
            ))}
            <Chip selected={draft.quand === "date"} onClick={() => toggle("quand", "date")}>
              {t.filter.date}
            </Chip>
          </div>
          {draft.quand === "date" && (
            <input
              type="date"
              min={today}
              value={draft.date ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              aria-label={t.filter.date}
              className="mt-3 h-12 w-full rounded-xl border border-line-strong bg-paper px-3"
            />
          )}
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t.filter.people}</legend>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Une personne de moins"
              disabled={people <= 1}
              onClick={() => setDraft((d) => ({ ...d, personnes: people - 1 > 1 ? String(people - 1) : undefined }))}
              className="grid size-11 place-items-center rounded-full border border-line-strong bg-paper disabled:opacity-40"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <span className="tabular min-w-8 text-center text-lg font-semibold" aria-live="polite">
              {people}
            </span>
            <button
              type="button"
              aria-label="Une personne de plus"
              disabled={people >= 20}
              onClick={() => setDraft((d) => ({ ...d, personnes: String(people + 1) }))}
              className="grid size-11 place-items-center rounded-full border border-line-strong bg-paper disabled:opacity-40"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t.filter.budget}</legend>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Chip key={b} selected={draft.budget === String(b)} onClick={() => toggle("budget", String(b))}>
                ≤ {b} €
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold">{t.filter.distance}</legend>
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map((d) => (
              <Chip key={d} selected={draft.distance === String(d)} onClick={() => toggle("distance", String(d))}>
                {d} km
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6 mb-2">
          <legend className="mb-2 text-sm font-semibold">{t.filter.setting}</legend>
          <div className="flex flex-wrap gap-2">
            {(["INDOOR", "OUTDOOR"] as const).map((s) => (
              <Chip key={s} selected={draft.cadre === s} onClick={() => toggle("cadre", s)}>
                {t.filter.settings[s]}
              </Chip>
            ))}
          </div>
        </fieldset>
      </BottomSheet>
    </div>
  );
}
