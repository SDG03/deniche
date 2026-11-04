import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirection avec un en-tête Location relatif.
 * Derrière un proxy (Render, etc.), `req.url` pointe vers l'adresse interne du
 * serveur (ex. localhost:10000) : construire une URL absolue à partir de lui
 * enverrait le visiteur au mauvais endroit. Un chemin relatif est valide (RFC 9110).
 */
export function redirectTo(path: string, init: { status?: number; headers?: Record<string, string> } = {}) {
  // NextResponse (et non Response) pour que les cookies posés via next/headers soient bien joints.
  return new NextResponse(null, { status: init.status ?? 307, headers: { ...init.headers, Location: path } });
}

/** Origine publique vue par le visiteur (en-têtes du proxy en priorité). */
export function publicOrigin(req: NextRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
