"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { saveSchedule } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { WEEKDAYS, WEEKDAY_ORDER, type WeeklyEntry } from "@/lib/schedule";
import { copy } from "@/lib/copy";

const sc = copy.partnerUi.schedule;

type Day = { open: boolean; times: string[]; capacity: number };

export function ScheduleEditor({
  activityId,
  initial,
  defaultCapacity,
}: {
  activityId: string;
  initial: WeeklyEntry[];
  defaultCapacity: number;
}) {
  const [days, setDays] = useState<Record<number, Day>>(() => {
    const out: Record<number, Day> = {};
    for (let d = 0; d < 7; d++) {
      const e = initial.find((x) => x.weekday === d);
      out[d] = e
        ? { open: true, times: [...e.times].sort(), capacity: e.capacity }
        : { open: false, times: ["10:00"], capacity: defaultCapacity };
    }
    return out;
  });
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const update = (d: number, patch: Partial<Day>) => {
    setMsg(null);
    setDays((x) => ({ ...x, [d]: { ...x[d], ...patch } }));
  };

  const save = () =>
    start(async () => {
      const template = WEEKDAY_ORDER.filter((d) => days[d].open && days[d].times.length).map((d) => ({
        weekday: d,
        times: days[d].times,
        capacity: days[d].capacity,
      }));
      const r = await saveSchedule({ activityId, template });
      setMsg(
        r.ok
          ? { ok: true, text: r.message ?? copy.partnerUi.pricing.saved }
          : { ok: false, text: r.error ?? copy.partnerUi.pricing.error },
      );
    });

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
        {WEEKDAY_ORDER.map((d) => {
          const day = days[d];
          return (
            <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
              <label className="flex min-h-11 w-full items-center gap-2 font-semibold sm:w-32">
                <input
                  type="checkbox"
                  checked={day.open}
                  onChange={(e) => update(d, { open: e.target.checked })}
                  className="size-5 accent-forest"
                />
                {WEEKDAYS[d]}
              </label>
              <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", !day.open && "opacity-40")}>
                {day.open ? (
                  <>
                    {day.times.map((t) => (
                      <span
                        key={t}
                        className="tabular inline-flex h-9 items-center gap-1 rounded-full bg-forest-soft pr-1 pl-3 text-sm font-semibold text-forest"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => update(d, { times: day.times.filter((x) => x !== t) })}
                          aria-label={sc.removeTime(t, WEEKDAYS[d].toLowerCase())}
                          className="grid size-7 place-items-center rounded-full hover:bg-forest/10"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="time"
                        step={900}
                        value={draft[d] ?? ""}
                        onChange={(e) => setDraft((x) => ({ ...x, [d]: e.target.value }))}
                        aria-label={sc.newTime(WEEKDAYS[d].toLowerCase())}
                        className="tabular h-9 rounded-full border border-line-strong bg-cream px-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!draft[d] || day.times.includes(draft[d])}
                        onClick={() => {
                          update(d, { times: [...day.times, draft[d]].sort() });
                          setDraft((x) => ({ ...x, [d]: "" }));
                        }}
                        aria-label={sc.addTime(WEEKDAYS[d].toLowerCase())}
                        className="grid size-9 place-items-center rounded-full border border-line-strong bg-paper hover:border-forest disabled:opacity-40"
                      >
                        <Plus aria-hidden className="size-4" />
                      </button>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-ink-mute">{sc.closed}</span>
                )}
              </div>
              {day.open && (
                <label className="flex items-center gap-2 text-sm">
                  {sc.seats}
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={day.capacity}
                    onChange={(e) => update(d, { capacity: Math.max(1, Number(e.target.value)) })}
                    className="tabular h-11 w-20 rounded-xl border border-line-strong bg-cream px-2 text-center"
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="forest" onClick={save} disabled={pending}>
          {pending ? sc.generating : sc.save}
        </Button>
        {msg && (
          <span role="status" className={cn("text-sm font-medium", msg.ok ? "text-success" : "text-danger")}>
            {msg.text}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-mute">{sc.note}</p>
    </div>
  );
}
