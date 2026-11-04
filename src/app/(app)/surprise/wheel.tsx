"use client";

import { ArrowRight, Dices, MapPin, RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { spinWheel, type WheelResult } from "@/app/actions/wheel";
import { CategoryIcon } from "@/components/category-icon";
import { buttonClass } from "@/components/ui/button";
import { DiscountBadge, PriceTag } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatKm, formatSlotWhen } from "@/lib/format";

type Segment = { id: string; category: string; label: string; city: string; title: string };

const t = copy.wheel;
const SIZE = 360;
const C = SIZE / 2;
const R = 158;
const SPIN_MS = 4200;
// Alternance sombre / clair, tirée de la palette (le corail reste réservé aux réductions et au CTA).
const FILLS = [
  { bg: "#1F3D2F", fg: "#FAF7F2" },
  { bg: "#EFE6D8", fg: "#14201B" },
  { bg: "#2F5A45", fg: "#FAF7F2" },
  { bg: "#E6ECE8", fg: "#14201B" },
];

function point(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
}

export function Wheel({ segments }: { segments: Segment[] }) {
  const n = segments.length;
  const seg = 360 / n;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelResult>(null);
  const [, start] = useTransition();
  const pending = useRef<WheelResult>(null);
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Sur mobile, le résultat s'affiche sous la roue : on l'amène à l'écran.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result]);

  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const finish = () => {
    if (done.current) clearTimeout(done.current);
    done.current = null;
    setSpinning(false);
    setResult(pending.current);
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    start(async () => {
      const winner = await spinWheel(segments.map((s) => s.id));
      pending.current = winner;
      const index = Math.max(
        0,
        segments.findIndex((s) => s.id === winner?.id),
      );
      const jitter = (Math.random() - 0.5) * seg * 0.6;
      const center = (index + 0.5) * seg + jitter;
      const delta = (((-center - rotation) % 360) + 360) % 360;
      const next = rotation + (reduced() ? 0 : 360 * 5) + delta;
      setRotation(next);
      // Repli si l'événement transitionend ne vient pas (onglet en arrière-plan, mouvement réduit).
      done.current = setTimeout(finish, reduced() ? 50 : SPIN_MS + 200);
    });
  };

  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="relative">
          {/* Pointeur */}
          <svg
            aria-hidden
            viewBox="0 0 40 44"
            className="absolute top-[-6px] left-1/2 z-10 h-11 w-10 -translate-x-1/2 drop-shadow"
          >
            <path d="M20 42 4 6a2 2 0 0 1 2-3h28a2 2 0 0 1 2 3L20 42Z" fill="#14201B" />
            <circle cx="20" cy="12" r="4" fill="#FF5A36" />
          </svg>

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full"
            role="img"
            aria-label={`${t.title} : ${segments.map((s) => s.title).join(", ")}`}
          >
            <circle cx={C} cy={C} r={C - 2} fill="#14201B" />
            {/* globals.css réduit déjà toutes les transitions à 1 ms si l'utilisateur préfère moins d'animations */}
            <g
              className="transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0.7,0.1,1)]"
              style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50% 50%" }}
              onTransitionEnd={finish}
            >
              {segments.map((s, i) => {
                const a0 = i * seg;
                const a1 = (i + 1) * seg;
                const [x0, y0] = point(a0, R);
                const [x1, y1] = point(a1, R);
                const mid = a0 + seg / 2;
                const fill = FILLS[i % FILLS.length];
                const flip = mid > 180;
                return (
                  <g key={s.id}>
                    <path
                      d={`M${C},${C} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`}
                      fill={fill.bg}
                      stroke="#14201B"
                      strokeWidth={1.5}
                    />
                    <g transform={`rotate(${mid} ${C} ${C})`}>
                      <CategoryIcon
                        slug={s.category}
                        x={C - 11}
                        y={C - R + 14}
                        width={22}
                        height={22}
                        color={fill.fg}
                      />
                      <text
                        x={C}
                        y={C - R * 0.56}
                        transform={`rotate(${flip ? 90 : -90} ${C} ${C - R * 0.56})`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={fill.fg}
                        fontSize={15}
                        fontWeight={700}
                        style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
                      >
                        {s.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
            {/* Ampoules du pourtour */}
            {Array.from({ length: 24 }, (_, i) => {
              const [x, y] = point(i * 15, C - 9);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2.6}
                  fill={i % 2 ? "#FAF7F2" : "#FF5A36"}
                  opacity={spinning && i % 2 ? 0.5 : 1}
                />
              );
            })}
            {/* Moyeu */}
            <circle cx={C} cy={C} r={34} fill="#FAF7F2" stroke="#14201B" strokeWidth={3} />
            <path
              d={`M${C} ${C - 17}c-7 0-12 5-12 11.7 0 8.5 9.6 17 11.2 18.4.5.5 1.1.5 1.6 0 1.6-1.4 11.2-9.9 11.2-18.4 0-6.7-5-11.7-12-11.7Z`}
              fill="#1F3D2F"
            />
            <circle cx={C} cy={C - 5} r={4.8} fill="#FF5A36" />
          </svg>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className={buttonClass({ variant: "primary", size: "lg", className: "mt-6 w-full" })}
        >
          {result ? <RotateCcw aria-hidden className="size-5" /> : <Dices aria-hidden className="size-5" />}
          {spinning ? t.spinning : result ? t.again : t.spin}
        </button>

        <details className="mt-3 text-sm text-ink-mute">
          <summary className="min-h-11 cursor-pointer py-2">{t.onWheel}</summary>
          <ul className="list-disc space-y-0.5 pl-5">
            {segments.map((s) => (
              <li key={s.id}>
                {s.title} · {s.city}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div ref={resultRef} aria-live="polite" className="min-h-[1px] scroll-mb-24">
        {result && (
          <article className="animate-fade-up overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
            <div className="relative aspect-[16/10] bg-sand">
              <Image
                src={result.image}
                alt={result.imageAlt}
                fill
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover"
              />
              <span className="absolute top-3 left-3 rounded-full bg-forest px-3 py-1 text-xs font-semibold text-cream">
                {t.result}
              </span>
              {result.slot.discountPct > 0 && (
                <DiscountBadge pct={result.slot.discountPct} className="absolute top-3 right-3" />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-forest">
                <CategoryIcon slug={result.category} className="size-4" />
                {result.categoryLabel}
                <span aria-hidden className="text-ink-mute">
                  ·
                </span>
                <MapPin aria-hidden className="size-3.5 text-ink-mute" />
                <span className="text-ink-mute">
                  {result.city} · {formatKm(result.distanceKm)}
                </span>
              </div>
              <h2 className="mt-1 font-display text-2xl leading-tight font-bold">{result.title}</h2>
              <p className="mt-1 text-ink-soft">{result.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream-deep px-4 py-3">
                <div className="text-sm">
                  <div className="text-xs text-ink-mute">{t.next}</div>
                  <div className="font-semibold first-letter:uppercase">{formatSlotWhen(result.slot.startsAt)}</div>
                </div>
                <PriceTag baseCents={result.slot.basePriceCents} currentCents={result.slot.unitPriceCents} />
              </div>
              <Link
                href={`/activite/${result.slug}?creneau=${result.slot.id}&surprise=1`}
                className={cn(buttonClass({ variant: "forest", size: "lg", className: "mt-4 w-full" }))}
              >
                {t.go}
                <ArrowRight aria-hidden className="size-5" />
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
