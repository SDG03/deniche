"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { savePricing } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DiscountBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { applyDiscount, priceCurve, sortTiers, type DiscountTier } from "@/lib/pricing";

type Rules = {
  lastMinuteEnabled: boolean;
  fillBonusEnabled: boolean;
  floorPct: number;
  quotaPct: number;
  cutoffMinutes: number;
  tiers: DiscountTier[];
};

const FILLS = [
  { label: "Créneau calme (20 %)", value: 0.2 },
  { label: "Normal (60 %)", value: 0.6 },
  { label: "Presque plein (90 %)", value: 0.9 },
];

export function PricingEditor({ activityId, basePriceCents, initial }: { activityId: string; basePriceCents: number; initial: Rules }) {
  const [rules, setRules] = useState<Rules>({ ...initial, tiers: sortTiers(initial.tiers) });
  const [fill, setFill] = useState(0.6);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => {
    setMsg(null);
    setRules((r) => ({ ...r, [k]: v }));
  };
  const setTier = (i: number, patch: Partial<DiscountTier>) =>
    set(
      "tiers",
      rules.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    );

  const curve = useMemo(
    () =>
      priceCurve(
        {
          basePriceCents,
          tiers: rules.tiers,
          floorPct: rules.floorPct,
          fillRate: fill,
          lastMinuteEnabled: rules.lastMinuteEnabled,
          fillBonusEnabled: rules.fillBonusEnabled,
        },
        96,
      ),
    [basePriceCents, rules, fill],
  );

  const save = () =>
    start(async () => {
      const r = await savePricing({ activityId, ...rules, tiers: sortTiers(rules.tiers) });
      setMsg(r.ok ? { ok: true, text: r.message ?? "Enregistré" } : { ok: false, text: r.error ?? "Erreur" });
      if (r.ok) setRules((x) => ({ ...x, tiers: sortTiers(x.tiers) }));
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* Aperçu en temps réel */}
      <section aria-labelledby="curve-title" className="rounded-[var(--radius-card)] border border-line bg-paper p-5 lg:sticky lg:top-6 lg:order-2 lg:self-start">
        <h2 id="curve-title" className="font-display text-xl font-bold">
          Prix par personne selon l&apos;heure de réservation
        </h2>
        <p className="mt-1 text-sm text-ink-mute">Base {formatPrice(basePriceCents)} · l&apos;axe va de 4 jours avant au départ.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Scénario de remplissage">
          {FILLS.map((f) => (
            <Chip key={f.value} selected={fill === f.value} onClick={() => setFill(f.value)} className="min-h-10 px-3 text-xs">
              {f.label}
            </Chip>
          ))}
        </div>
        <PriceChart curve={curve} basePriceCents={basePriceCents} floorPct={rules.floorPct} cutoffMinutes={rules.cutoffMinutes} />
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Prix par palier</caption>
          <thead>
            <tr className="text-left text-xs text-ink-mute">
              <th className="py-1 font-medium">Réservé…</th>
              <th className="py-1 font-medium">Réduction</th>
              <th className="py-1 text-right font-medium">Prix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortTiers(rules.tiers).map((t, i, arr) => {
              const point = curve.find((p) => p.hoursLeft === Math.min(96, Math.ceil(t.minHours))) ?? curve[curve.length - 1];
              const label = i === 0 ? `${t.minHours} h ou plus avant` : t.minHours === 0 ? `moins de ${arr[i - 1].minHours} h avant` : `entre ${t.minHours} et ${arr[i - 1].minHours} h avant`;
              return (
                <tr key={i}>
                  <td className="py-2">{label}</td>
                  <td className="py-2">{point.discountPct > 0 ? <DiscountBadge pct={point.discountPct} size="sm" /> : "—"}</td>
                  <td className="tabular py-2 text-right font-semibold">{formatPrice(point.unitPriceCents)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Règles */}
      <section aria-labelledby="rules-title" className="space-y-5 lg:order-1">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 id="rules-title" className="font-display text-xl font-bold">
            Règles de réduction
          </h2>
          <label className="mt-4 flex min-h-11 items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Dernière minute activée</span>
              <span className="text-sm text-ink-mute">Sans elle, le prix reste fixe.</span>
            </span>
            <input type="checkbox" checked={rules.lastMinuteEnabled} onChange={(e) => set("lastMinuteEnabled", e.target.checked)} className="size-6 accent-forest" />
          </label>

          <fieldset className={cn("mt-5", !rules.lastMinuteEnabled && "pointer-events-none opacity-50")} disabled={!rules.lastMinuteEnabled}>
            <legend className="text-sm font-semibold">Paliers</legend>
            <ul className="mt-2 space-y-2">
              {rules.tiers.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>À partir de</span>
                  <input
                    type="number"
                    min={0}
                    max={336}
                    value={t.minHours}
                    onChange={(e) => setTier(i, { minHours: Math.max(0, Number(e.target.value)) })}
                    aria-label={`Seuil du palier ${i + 1} en heures`}
                    className="tabular h-11 w-20 rounded-xl border border-line-strong bg-cream px-2 text-center"
                  />
                  <span>h avant :</span>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={t.pct}
                    onChange={(e) => setTier(i, { pct: Math.min(90, Math.max(0, Math.round(Number(e.target.value)))) })}
                    aria-label={`Réduction du palier ${i + 1} en pourcent`}
                    className="tabular h-11 w-16 rounded-xl border border-line-strong bg-cream px-2 text-center"
                  />
                  <span>%</span>
                  <button
                    type="button"
                    onClick={() => set("tiers", rules.tiers.filter((_, j) => j !== i))}
                    disabled={rules.tiers.length <= 1}
                    aria-label={`Supprimer le palier ${i + 1}`}
                    className="ml-auto grid size-11 place-items-center rounded-full text-ink-mute hover:bg-ink/5 hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-forest"
              disabled={rules.tiers.length >= 8}
              onClick={() => set("tiers", [...rules.tiers, { minHours: 1, pct: 45 }])}
            >
              <Plus aria-hidden className="size-4" /> Ajouter un palier
            </Button>
          </fieldset>
        </div>

        <div className="space-y-5 rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <Slider
            label="Prix plancher"
            hint={`Jamais moins de ${formatPrice(applyDiscount(basePriceCents, 100 - rules.floorPct, rules.floorPct))} par personne.`}
            value={rules.floorPct}
            min={30}
            max={100}
            step={5}
            unit="% du prix de base"
            onChange={(v) => set("floorPct", v)}
          />
          <Slider
            label="Quota de places réduites"
            hint="Au-delà, les places restantes sont au plein tarif."
            value={rules.quotaPct}
            min={0}
            max={100}
            step={10}
            unit="% de la capacité"
            onChange={(v) => set("quotaPct", v)}
          />
          <Slider
            label="Fermeture des réservations"
            hint="Délai avant le début du créneau."
            value={rules.cutoffMinutes}
            min={0}
            max={240}
            step={15}
            unit="min avant"
            onChange={(v) => set("cutoffMinutes", v)}
          />
          <label className="flex min-h-11 items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Bonus créneau calme</span>
              <span className="text-sm text-ink-mute">+10 points si rempli à moins de 40 % à moins de 24 h. Aucune réduction au-delà de 80 %.</span>
            </span>
            <input type="checkbox" checked={rules.fillBonusEnabled} onChange={(e) => set("fillBonusEnabled", e.target.checked)} className="size-6 accent-forest" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="forest" onClick={save} disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer les règles"}
          </Button>
          <Button variant="ghost" onClick={() => setRules({ ...initial, tiers: sortTiers(initial.tiers) })}>
            Annuler les changements
          </Button>
          {msg && (
            <span role="status" className={cn("text-sm font-medium", msg.ok ? "text-success" : "text-danger")}>
              {msg.text}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const id = label.replace(/\W+/g, "-");
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span className="tabular text-sm font-semibold">
          {value} <span className="font-normal text-ink-mute">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full accent-forest"
      />
      <p className="text-sm text-ink-mute">{hint}</p>
    </div>
  );
}

/** Courbe en escalier : une seule série (pas de légende), crosshair + infobulle au survol. */
function PriceChart({
  curve,
  basePriceCents,
  floorPct,
  cutoffMinutes,
}: {
  curve: { hoursLeft: number; unitPriceCents: number; discountPct: number }[];
  basePriceCents: number;
  floorPct: number;
  cutoffMinutes: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Le SVG suit la largeur réelle du conteneur : le texte garde sa taille en px.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 240;
  const pad = { l: 44, r: 12, t: 14, b: 30 };
  const maxH = curve[0].hoursLeft;
  const yMax = basePriceCents * 1.08;
  const floorCents = (basePriceCents * floorPct) / 100;
  const yMin = Math.min(floorCents, ...curve.map((p) => p.unitPriceCents)) * 0.85;
  const x = (h: number) => pad.l + ((maxH - h) / maxH) * (W - pad.l - pad.r);
  const y = (c: number) => pad.t + (1 - (c - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  let d = "";
  curve.forEach((p, i) => {
    const px = x(p.hoursLeft);
    const py = y(p.unitPriceCents);
    if (i === 0) d += `M${px},${py}`;
    else d += `H${px}V${py}`;
  });

  const ticks = (W < 420 ? [96, 72, 48, 24, 0] : [96, 72, 48, 24, 6, 0]).filter((h) => h <= maxH);
  const yTicks = [basePriceCents, Math.round((basePriceCents + yMin) / 2)];
  const hp = hover === null ? null : curve.find((p) => p.hoursLeft === hover);
  const cutoffX = x(cutoffMinutes / 60);

  return (
    <div ref={box} className="relative mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        height={H}
        className="w-full touch-none select-none"
        role="img"
        aria-label="Courbe de prix : le prix par personne baisse par paliers à l'approche du départ."
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const vx = ((e.clientX - r.left) / r.width) * W;
          const h = Math.round(maxH - ((vx - pad.l) / (W - pad.l - pad.r)) * maxH);
          setHover(Math.min(maxH, Math.max(0, h)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* grille horizontale, discrète */}
        {yTicks.map((c) => (
          <g key={c}>
            <line x1={pad.l} x2={W - pad.r} y1={y(c)} y2={y(c)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(c) + 4} textAnchor="end" fontSize={12} fill="var(--ink-mute)">
              {Math.round(c / 100)} €
            </text>
          </g>
        ))}
        {/* plancher */}
        <line x1={pad.l} x2={W - pad.r} y1={y(floorCents)} y2={y(floorCents)} stroke="var(--ink-mute)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={W - pad.r} y={y(floorCents) - 5} textAnchor="end" fontSize={12} fill="var(--ink-mute)">
          plancher {Math.round(floorCents / 100)} €
        </text>
        {/* fermeture */}
        {cutoffMinutes > 0 && (
          <rect x={cutoffX} y={pad.t} width={W - pad.r - cutoffX} height={H - pad.t - pad.b} fill="var(--sand)" opacity={0.6}>
            <title>Réservations fermées</title>
          </rect>
        )}
        {/* axe X */}
        {ticks.map((h) => (
          <text key={h} x={x(h)} y={H - 8} textAnchor={h === 0 ? "end" : h === maxH ? "start" : "middle"} fontSize={12} fill="var(--ink-mute)">
            {h === 0 ? "départ" : `${h} h`}
          </text>
        ))}
        <path d={d} fill="none" stroke="var(--forest)" strokeWidth={2.5} strokeLinejoin="round" />
        {hp && (
          <g>
            <line x1={x(hp.hoursLeft)} x2={x(hp.hoursLeft)} y1={pad.t} y2={H - pad.b} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={x(hp.hoursLeft)} cy={y(hp.unitPriceCents)} r={5} fill="var(--forest)" stroke="var(--paper)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="tabular pointer-events-none absolute top-0 rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-[0_6px_20px_rgb(20_32_27/0.12)]"
          style={{ left: `${(x(hp.hoursLeft) / W) * 100}%`, transform: `translateX(${hp.hoursLeft < maxH / 2 ? "-100%" : "0"})` }}
        >
          <div className="text-ink-mute">{hp.hoursLeft === 0 ? "Au départ" : `${hp.hoursLeft} h avant`}</div>
          <div className="text-sm font-bold text-ink">
            {formatPrice(hp.unitPriceCents)} {hp.discountPct > 0 && <span className="text-coral-ink">−{hp.discountPct} %</span>}
          </div>
        </div>
      )}
    </div>
  );
}
