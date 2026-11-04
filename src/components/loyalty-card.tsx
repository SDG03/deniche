import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { perkLabel, STAMPS_PER_REWARD, type LoyaltyCard as Card } from "@/lib/loyalty";

type RewardView = {
  id: string;
  kind: string;
  code: string;
  status: "AVAILABLE" | "ATTACHED" | "USED";
  activity?: string;
};

const t = copy.loyalty;

export function LoyaltyCard({ card, rewards }: { card: Card; rewards: RewardView[] }) {
  const open = rewards.filter((r) => r.status !== "USED");
  return (
    <section aria-labelledby="fidelite" className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="fidelite" className="font-display text-xl font-bold">
            {t.title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-mute">{t.intro}</p>
        </div>
        <Gift aria-hidden className="size-6 shrink-0 text-coral-ink" />
      </div>

      <div
        className="mt-4 flex items-center gap-3"
        role="img"
        aria-label={t.stampLabel(card.stamps, STAMPS_PER_REWARD)}
      >
        {Array.from({ length: STAMPS_PER_REWARD }, (_, i) => {
          const done = i < card.stamps;
          return (
            <span
              key={i}
              className={cn(
                "grid size-14 place-items-center rounded-full border-2 transition-colors",
                done ? "border-forest bg-forest text-cream" : "border-dashed border-line-strong text-line-strong",
              )}
            >
              {done ? (
                <Check aria-hidden className="size-6" strokeWidth={2.5} />
              ) : (
                <span className="font-display font-bold">{i + 1}</span>
              )}
            </span>
          );
        })}
        <span aria-hidden className="h-0.5 w-4 bg-line-strong" />
        <span className="grid size-14 place-items-center rounded-full bg-coral-soft text-coral-ink">
          <Gift aria-hidden className="size-6" />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold">{t.toNext(card.toNext, perkLabel(card.nextPerk))}</p>

      <ul className="mt-4 space-y-2">
        {open.length === 0 && <li className="text-sm text-ink-mute">{t.none}</li>}
        {open.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream-deep px-3.5 py-2.5">
            <span className="min-w-0">
              <span className="block font-semibold">{perkLabel(r.kind)}</span>
              <span className="block truncate text-xs text-ink-mute">
                {r.status === "ATTACHED" ? `${t.attached}${r.activity ? ` · ${r.activity}` : ""}` : r.code}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-2xs font-semibold",
                r.status === "AVAILABLE" ? "bg-coral text-ink" : "bg-forest-soft text-forest",
              )}
            >
              {r.status === "AVAILABLE" ? t.available : t.giftBadge}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
