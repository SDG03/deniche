import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForUser } from "@/lib/booking";
import { buildIcs } from "@/lib/ics";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/reservations/[id]/ics">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non connecté", { status: 401 });
  const b = await getBookingForUser(id, user.id);
  if (!b || (b.status !== "CONFIRMED" && b.status !== "CHECKED_IN")) return new NextResponse("Introuvable", { status: 404 });
  const a = b.slot.activity;
  const ics = buildIcs({
    uid: b.reference,
    title: `${a.title} (Déniche)`,
    description: `Réservation ${b.reference} · ${b.people} pers. · code d'arrivée ${b.checkinCode}`,
    location: a.address,
    start: b.slot.startsAt,
    durationMin: a.durationMin,
    url: new URL(`/reservation/${b.id}`, req.url).toString(),
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="deniche-${b.reference}.ics"`,
    },
  });
}
