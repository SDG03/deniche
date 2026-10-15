"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { tiersSchema } from "@/lib/activity-pricing";
import { requirePartner } from "@/lib/auth";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { normalizeCode, randomCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { topUpSlots } from "@/lib/inventory";
import { getPartnerActivity } from "@/lib/partner";
import { DEFAULT_TIERS } from "@/lib/pricing";
import { weeklyTemplateSchema } from "@/lib/schedule";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

// ------------------------------------------------------------- activité

const activitySchema = z
  .object({
    title: z.string().trim().min(4, "Un titre d'au moins 4 caractères.").max(80),
    tagline: z.string().trim().min(4, "Une accroche courte.").max(120),
    category: z.enum(CATEGORY_SLUGS),
    description: z.string().trim().min(40, "Raconte un peu plus (40 caractères minimum).").max(3000),
    address: z.string().trim().min(5, "Adresse requise.").max(160),
    city: z.string().trim().min(2).max(60),
    latitude: z.coerce.number().min(49.4).max(51.6),
    longitude: z.coerce.number().min(2.5).max(6.5),
    durationMin: z.coerce.number().int().min(15).max(720),
    minPeople: z.coerce.number().int().min(1).max(50),
    maxPeople: z.coerce.number().int().min(1).max(200),
    basePrice: z.coerce.number().min(1, "Prix minimum : 1 €.").max(1000),
    minAge: z.coerce.number().int().min(0).max(99),
    setting: z.enum(["INDOOR", "OUTDOOR", "MIXED"]),
    level: z.enum(["EASY", "MEDIUM", "HARD"]),
    accessibility: z.string().trim().max(300).default(""),
    tags: z.string().max(200).default(""),
    cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
    published: z.coerce.boolean().default(false),
    keepImages: z.array(z.string().max(200)).default([]),
  })
  .refine((d) => d.maxPeople >= d.minPeople, { path: ["maxPeople"], message: "Le maximum doit dépasser le minimum." });

const MAX_UPLOAD = 4 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function saveUploads(files: File[]) {
  const out: string[] = [];
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  for (const f of files) {
    if (!f.size) continue;
    if (f.size > MAX_UPLOAD) throw new Error("Une photo dépasse 4 Mo.");
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[f.type];
    if (!ext) throw new Error("Formats acceptés : JPG, PNG ou WebP.");
    const name = `${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
    out.push(`/media/${name}`);
  }
  return out;
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function saveActivity(_: FormState, formData: FormData): Promise<FormState> {
  const { partnerId } = await requirePartner();
  const id = String(formData.get("id") ?? "");
  const parsed = activitySchema.safeParse({
    ...Object.fromEntries(formData),
    published: formData.get("published") === "on",
    keepImages: formData.getAll("keepImages").map(String),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Quelques champs sont à revoir.", fieldErrors };
  }
  const d = parsed.data;
  let uploaded: string[];
  try {
    uploaded = await saveUploads(formData.getAll("photos").filter((f): f is File => f instanceof File));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const existing = id ? await getPartnerActivity(partnerId, id) : null;
  if (id && !existing) return { error: "Activité introuvable." };
  const allowedKeep = new Set((existing?.images as string[] | undefined) ?? []);
  const oldCredits = (existing?.imageCredits as { author: string; license: string; source: string }[] | undefined) ?? [];
  const kept = d.keepImages.filter((src) => allowedKeep.has(src));
  let images = [...kept, ...uploaded].slice(0, 8);
  let imageCredits = images.map((src) => {
    const i = ((existing?.images as string[] | undefined) ?? []).indexOf(src);
    return i >= 0 && oldCredits[i] ? oldCredits[i] : { author: "Partenaire", license: "Fournie par le partenaire", source: "" };
  });
  if (!images.length) {
    images = [1, 2, 3].map((n) => `/images/covers/${d.category}-${n}.svg`);
    imageCredits = images.map(() => ({ author: "Illustration Déniche", license: "Interne", source: "" }));
  }

  const data = {
    title: d.title,
    tagline: d.tagline,
    category: d.category,
    description: d.description,
    address: d.address,
    city: d.city,
    latitude: d.latitude,
    longitude: d.longitude,
    durationMin: d.durationMin,
    minPeople: d.minPeople,
    maxPeople: d.maxPeople,
    basePriceCents: Math.round(d.basePrice * 100),
    minAge: d.minAge,
    setting: d.setting,
    level: d.level,
    accessibility: d.accessibility,
    tags: d.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6),
    cancellationPolicy: d.cancellationPolicy,
    published: d.published,
    images,
    imageCredits,
  };

  let activityId = id;
  if (existing) {
    await db.activity.update({ where: { id: existing.id }, data });
  } else {
    let slug = slugify(d.title) || "activite";
    if (await db.activity.findUnique({ where: { slug } })) slug = `${slug}-${randomCode(4).toLowerCase()}`;
    const created = await db.activity.create({
      data: {
        ...data,
        slug,
        partnerId,
        discountTiers: DEFAULT_TIERS,
        weeklyTemplate: [
          { weekday: 6, times: ["10:00", "14:00"], capacity: Math.min(10, d.maxPeople) },
          { weekday: 0, times: ["10:00", "14:00"], capacity: Math.min(10, d.maxPeople) },
        ],
      },
    });
    activityId = created.id;
    await topUpSlots(new Date(), activityId);
  }
  revalidatePath("/partenaire", "layout");
  revalidatePath("/", "layout");
  if (!existing) redirect(`/partenaire/activites/${activityId}?cree=1`);
  return { ok: true, message: "Activité enregistrée." };
}

// ------------------------------------------------------------- tarifs

const pricingSchema = z.object({
  activityId: z.string().min(1),
  lastMinuteEnabled: z.boolean(),
  fillBonusEnabled: z.boolean(),
  floorPct: z.number().int().min(10).max(100),
  quotaPct: z.number().int().min(0).max(100),
  cutoffMinutes: z.number().int().min(0).max(24 * 60),
  tiers: tiersSchema,
});

export async function savePricing(input: z.input<typeof pricingSchema>): Promise<FormState> {
  const { partnerId } = await requirePartner();
  const parsed = pricingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Règles invalides." };
  const d = parsed.data;
  const a = await getPartnerActivity(partnerId, d.activityId);
  if (!a) return { error: "Activité introuvable." };
  const hours = d.tiers.map((t) => t.minHours);
  if (new Set(hours).size !== hours.length) return { error: "Deux paliers ont le même seuil d'heures." };
  if (!hours.includes(0)) return { error: "Il faut un palier qui commence à 0 h (le dernier moment)." };
  await db.activity.update({
    where: { id: a.id },
    data: {
      lastMinuteEnabled: d.lastMinuteEnabled,
      fillBonusEnabled: d.fillBonusEnabled,
      floorPct: d.floorPct,
      quotaPct: d.quotaPct,
      cutoffMinutes: d.cutoffMinutes,
      discountTiers: [...d.tiers].sort((x, y) => y.minHours - x.minHours),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Règles enregistrées. Les prix affichés sont déjà à jour." };
}

// ------------------------------------------------------------- créneaux

export async function saveSchedule(input: { activityId: string; template: unknown }): Promise<FormState & { created?: number }> {
  const { partnerId } = await requirePartner();
  const a = await getPartnerActivity(partnerId, input.activityId);
  if (!a) return { error: "Activité introuvable." };
  const t = weeklyTemplateSchema.safeParse(input.template);
  if (!t.success) return { error: "Modèle invalide : vérifie les horaires et capacités." };
  await db.activity.update({ where: { id: a.id }, data: { weeklyTemplate: t.data } });
  const created = await topUpSlots(new Date(), a.id);
  revalidatePath("/", "layout");
  return {
    ok: true,
    created,
    message: created ? `${created} nouveau${created > 1 ? "x" : ""} créneau${created > 1 ? "x" : ""} sur les 3 prochaines semaines.` : "Modèle enregistré. Tous les créneaux existaient déjà.",
  };
}

// ------------------------------------------------------------- accueil (check-in)

export type CheckinResult = {
  status: "idle" | "found" | "checked" | "already" | "not_found" | "cancelled";
  booking?: { id: string; reference: string; name: string; people: number; activity: string; startsAt: string; names: string[] };
};

async function findForPartner(partnerId: string, raw: string) {
  // Accepte le contenu du QR (DENICHE:REF:CODE), la référence ou le code d'arrivée.
  const input = normalizeCode(raw);
  const qr = input.match(/^DENICHE:?(DN-[A-Z0-9]{6}):?([A-Z0-9]{6})$/);
  const where = qr
    ? { reference: qr[1], checkinCode: qr[2] }
    : input.startsWith("DN-")
      ? { reference: input }
      : { checkinCode: input };
  return db.booking.findFirst({
    where: { ...where, slot: { activity: { partnerId } } },
    include: { user: true, slot: { include: { activity: true } } },
    orderBy: { slot: { startsAt: "desc" } },
  });
}

export async function lookupCheckin(_: CheckinResult, formData: FormData): Promise<CheckinResult> {
  const { partnerId } = await requirePartner();
  const raw = String(formData.get("code") ?? "");
  if (formData.get("confirm")) {
    const b = await db.booking.findFirst({ where: { id: String(formData.get("confirm")), slot: { activity: { partnerId } } } });
    if (!b) return { status: "not_found" };
    const r = await db.booking.updateMany({ where: { id: b.id, status: "CONFIRMED" }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
    revalidatePath("/partenaire", "layout");
    const full = await findForPartner(partnerId, b.reference);
    return { status: r.count ? "checked" : "already", booking: full ? view(full) : undefined };
  }
  if (normalizeCode(raw).length < 6) return { status: "not_found" };
  const b = await findForPartner(partnerId, raw);
  if (!b) return { status: "not_found" };
  if (b.status === "CANCELLED") return { status: "cancelled", booking: view(b) };
  if (b.status === "CHECKED_IN") return { status: "already", booking: view(b) };
  return { status: "found", booking: view(b) };
}

function view(b: NonNullable<Awaited<ReturnType<typeof findForPartner>>>) {
  return {
    id: b.id,
    reference: b.reference,
    name: b.user.name,
    people: b.people,
    activity: b.slot.activity.title,
    startsAt: b.slot.startsAt.toISOString(),
    names: b.participantNames as string[],
  };
}

export async function quickCheckin(formData: FormData) {
  const { partnerId } = await requirePartner();
  const id = String(formData.get("bookingId") ?? "");
  await db.booking.updateMany({
    where: { id, status: "CONFIRMED", slot: { activity: { partnerId } } },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });
  revalidatePath("/partenaire", "layout");
}
