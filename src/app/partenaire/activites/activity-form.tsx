"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { saveActivity, type FormState } from "@/app/actions/partner";
import { buttonClass } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

const f = copy.partnerUi.form;

/** Localités de la zone avec coordonnées par défaut (modifiables). */
const TOWNS: Record<string, [number, number]> = {
  Liège: [50.6412, 5.5718],
  "Liège (Grivegnée)": [50.6262, 5.6111],
  Herstal: [50.6625, 5.6276],
  Seraing: [50.5938, 5.4887],
  Verviers: [50.5892, 5.8628],
  Spa: [50.4924, 5.8649],
  Malmedy: [50.426, 6.028],
  Durbuy: [50.3525, 5.4563],
  Aywaille: [50.474, 5.676],
  "Waremme (Hesbaye)": [50.6962, 5.2489],
  "Hannut (Hesbaye)": [50.6721, 5.0785],
  Eupen: [50.6305, 6.0346],
};

export type ActivityFormValues = {
  id?: string;
  title: string;
  tagline: string;
  category: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  durationMin: number;
  minPeople: number;
  maxPeople: number;
  basePrice: number;
  minAge: number;
  setting: "INDOOR" | "OUTDOOR" | "MIXED";
  level: "EASY" | "MEDIUM" | "HARD";
  accessibility: string;
  tags: string;
  cancellationPolicy: "FLEXIBLE" | "MODERATE" | "STRICT";
  published: boolean;
  images: string[];
};

const input =
  "mt-1 h-12 w-full rounded-xl border border-line-strong bg-paper px-3.5 focus:border-forest focus:outline-none aria-invalid:border-danger";

function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ActivityForm({ values }: { values: ActivityFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveActivity, {});
  const [coords, setCoords] = useState<[number, number]>([values.latitude, values.longitude]);
  const [city, setCity] = useState(values.city);
  const [kept, setKept] = useState(values.images);
  const [previews, setPreviews] = useState<string[]>([]);
  const e = state.fieldErrors ?? {};
  const err = (n: string) => (e[n] ? { "aria-invalid": true, "aria-describedby": `${n}-error` } : {});

  return (
    <form action={action} className="space-y-8">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <h2 className="font-display text-xl font-bold">{f.texts}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={f.title} name="title" error={e.title} className="md:col-span-2">
            <input
              id="title"
              name="title"
              defaultValue={values.title}
              maxLength={80}
              className={input}
              {...err("title")}
            />
          </Field>
          <Field label={f.tagline} name="tagline" error={e.tagline} hint={f.taglineHint} className="md:col-span-2">
            <input
              id="tagline"
              name="tagline"
              defaultValue={values.tagline}
              maxLength={120}
              className={input}
              {...err("tagline")}
            />
          </Field>
          <Field label={f.category} name="category" error={e.category}>
            <select id="category" name="category" defaultValue={values.category} className={input}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.tags} name="tags" hint={f.tagsHint}>
            <input id="tags" name="tags" defaultValue={values.tags} className={input} />
          </Field>
          <Field
            label={f.description}
            name="description"
            error={e.description}
            hint={f.descriptionHint}
            className="md:col-span-2"
          >
            <textarea
              id="description"
              name="description"
              defaultValue={values.description}
              rows={7}
              className={cn(input, "h-auto py-3 leading-relaxed")}
              {...err("description")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <h2 className="font-display text-xl font-bold">{f.photos}</h2>
        <p className="mt-1 text-sm text-ink-mute">{f.photosHint}</p>
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {kept.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand">
              <input type="hidden" name="keepImages" value={src} />
              <Image src={src} alt={f.photo(i + 1)} fill sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => setKept((k) => k.filter((x) => x !== src))}
                aria-label={f.removePhoto(i + 1)}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-paper/90"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
          {previews.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand ring-2 ring-forest">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={f.newPhoto(i + 1)} className="size-full object-cover" />
            </li>
          ))}
          <li>
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong text-xs font-semibold text-ink-soft hover:border-forest hover:text-forest">
              <ImagePlus aria-hidden className="size-6" />
              {f.addPhoto}
              <input
                type="file"
                name="photos"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(ev) => setPreviews(Array.from(ev.target.files ?? []).map((f) => URL.createObjectURL(f)))}
              />
            </label>
          </li>
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <h2 className="font-display text-xl font-bold">{f.place}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={f.address} name="address" error={e.address} className="md:col-span-2">
            <input id="address" name="address" defaultValue={values.address} className={input} {...err("address")} />
          </Field>
          <Field label={f.city} name="city">
            <input
              id="city"
              name="city"
              list="towns"
              value={city}
              onChange={(ev) => {
                setCity(ev.target.value);
                const t = TOWNS[ev.target.value];
                if (t) setCoords(t);
              }}
              className={input}
            />
            <datalist id="towns">
              {Object.keys(TOWNS).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={f.latitude} name="latitude" error={e.latitude}>
              <input
                id="latitude"
                name="latitude"
                inputMode="decimal"
                value={coords[0]}
                onChange={(ev) => setCoords([Number(ev.target.value), coords[1]])}
                className={input}
              />
            </Field>
            <Field label={f.longitude} name="longitude" error={e.longitude}>
              <input
                id="longitude"
                name="longitude"
                inputMode="decimal"
                value={coords[1]}
                onChange={(ev) => setCoords([coords[0], Number(ev.target.value)])}
                className={input}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <h2 className="font-display text-xl font-bold">{f.format}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label={f.price} name="basePrice" error={e.basePrice}>
            <input
              id="basePrice"
              name="basePrice"
              type="number"
              step="0.5"
              min="1"
              defaultValue={values.basePrice}
              className={input}
              {...err("basePrice")}
            />
          </Field>
          <Field label={f.duration} name="durationMin" error={e.durationMin}>
            <input
              id="durationMin"
              name="durationMin"
              type="number"
              min="15"
              step="5"
              defaultValue={values.durationMin}
              className={input}
            />
          </Field>
          <Field label={f.minPeople} name="minPeople" error={e.minPeople}>
            <input
              id="minPeople"
              name="minPeople"
              type="number"
              min="1"
              defaultValue={values.minPeople}
              className={input}
            />
          </Field>
          <Field label={f.maxPeople} name="maxPeople" error={e.maxPeople}>
            <input
              id="maxPeople"
              name="maxPeople"
              type="number"
              min="1"
              defaultValue={values.maxPeople}
              className={input}
              {...err("maxPeople")}
            />
          </Field>
          <Field label={f.minAge} name="minAge">
            <input id="minAge" name="minAge" type="number" min="0" defaultValue={values.minAge} className={input} />
          </Field>
          <Field label={f.setting} name="setting">
            <select id="setting" name="setting" defaultValue={values.setting} className={input}>
              <option value="INDOOR">{copy.explore.filter.settings.INDOOR}</option>
              <option value="OUTDOOR">{copy.explore.filter.settings.OUTDOOR}</option>
              <option value="MIXED">{copy.explore.filter.settings.MIXED}</option>
            </select>
          </Field>
          <Field label={f.level} name="level">
            <select id="level" name="level" defaultValue={values.level} className={input}>
              {Object.entries(copy.activity.levels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.cancellation} name="cancellationPolicy">
            <select
              id="cancellationPolicy"
              name="cancellationPolicy"
              defaultValue={values.cancellationPolicy}
              className={input}
            >
              {Object.entries(copy.activity.policies).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.accessibility} name="accessibility" className="col-span-2 md:col-span-4">
            <input id="accessibility" name="accessibility" defaultValue={values.accessibility} className={input} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-ink-mute">{f.capacityNote}</p>
      </section>

      <div className="pb-safe sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="published" defaultChecked={values.published} className="size-5 accent-forest" />
          {f.published}
        </label>
        <div className="flex-1" aria-live="polite">
          {state.error && <span className="text-sm font-medium text-danger">{state.error}</span>}
          {state.ok && <span className="text-sm font-medium text-success">{state.message}</span>}
        </div>
        <button type="submit" disabled={pending} className={buttonClass({ variant: "forest" })}>
          {pending ? f.saving : values.id ? copy.partner.save : f.create}
        </button>
      </div>
    </form>
  );
}
