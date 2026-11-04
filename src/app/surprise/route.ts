import type { NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { redirectTo } from "@/lib/http";
import { surprise } from "@/lib/recommend";
import { getTriedCategories } from "@/lib/user-data";

/** « Surprends-moi » : tire une activité et ouvre directement son meilleur créneau. */
export async function GET(req: NextRequest) {
  const now = new Date();
  const [catalog, tried] = await Promise.all([getCatalog({ now }), getTriedCategories()]);
  const exclude = req.nextUrl.searchParams.get("sauf");
  const pool = catalog.length > 1 && exclude ? catalog.filter((a) => a.slug !== exclude) : catalog;
  const hit = surprise(pool, tried, now);
  if (!hit) return redirectTo("/explorer");
  const params = new URLSearchParams({ creneau: hit.slot.id, surprise: "1" });
  return redirectTo(`/activite/${hit.a.slug}?${params}`, { headers: { "Cache-Control": "no-store" } });
}
