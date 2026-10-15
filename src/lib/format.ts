import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { copy } from "./copy";

export const TZ = "Europe/Brussels";
export const LOCALE = "fr-BE";

const priceFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const priceFmtShort = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 2150 → « 21,50 € » ; 2000 → « 20 € » en mode court. */
export function formatPrice(cents: number, opts: { short?: boolean } = {}) {
  const v = cents / 100;
  if (opts.short && Number.isInteger(v)) return priceFmtShort.format(v);
  return priceFmt.format(v);
}

export function inBrussels(d: Date | string | number) {
  return new TZDate(new Date(d).getTime(), TZ);
}

export function formatTime(d: Date | string) {
  return format(inBrussels(d), "HH:mm", { locale: fr });
}

/** « sam. 14 nov. » */
export function formatDayShort(d: Date | string) {
  return format(inBrussels(d), "EEE d MMM", { locale: fr });
}

/** « samedi 14 novembre » */
export function formatDayLong(d: Date | string) {
  return format(inBrussels(d), "EEEE d MMMM", { locale: fr });
}

/** « Aujourd'hui », « Demain », « samedi 14 nov. » */
export function formatRelativeDay(d: Date | string, now: Date = new Date()) {
  const a = inBrussels(d);
  const b = inBrussels(now);
  const diff = differenceInCalendarDays(a, b);
  if (diff === 0) return copy.home.quickWhen.today;
  if (diff === 1) return copy.home.quickWhen.tomorrow;
  return format(a, "EEEE d MMM", { locale: fr });
}

export function formatSlotWhen(d: Date | string, now: Date = new Date()) {
  return `${formatRelativeDay(d, now)} · ${formatTime(d)}`;
}

/** Clé jour locale « 2026-11-14 » (Bruxelles). */
export function dayKey(d: Date | string) {
  return format(inBrussels(d), "yyyy-MM-dd");
}

/** Début (UTC) du jour local `key` à Bruxelles. */
export function startOfBrusselsDay(key: string) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, day, 0, 0, 0, TZ).getTime());
}

export function brusselsDays(from: Date, count: number) {
  const start = inBrussels(from);
  return Array.from({ length: count }, (_, i) => dayKey(addDays(start, i)));
}

export function isTodayBrussels(d: Date, now = new Date()) {
  return isSameDay(inBrussels(d), inBrussels(now));
}

/** 2 h 10, 45 min, 3 j */
export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 48) return `${Math.round(h / 24)} j`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}
