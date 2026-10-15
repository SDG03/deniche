import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { surprise } from "@/lib/recommend";
import { getTriedCategories } from "@/lib/user-data";

/** « Surprends-moi » : tire une activité et ouvre directement son meilleur créneau. */
export async function GET(req: NextRequest) {
  const now = new Date();
  const [catalog, tried] = await Promise.all([getCatalog({ now }), getTriedCategories()]);
  const exclude = req.nextUrl.searchParams.get("sauf");
  const pool = catalog.length > 1 && exclude ? catalog.filter((a) => a.slug !== exclude) : catalog;
  const hit = surprise(pool, tried, now);
  if (!hit) return NextResponse.redirect(new URL("/explorer", req.url));
  const url = new URL(`/activite/${hit.a.slug}`, req.url);
  url.searchParams.set("creneau", hit.slot.id);
  url.searchParams.set("surprise", "1");
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
