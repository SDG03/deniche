import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DIR = path.join(process.cwd(), "uploads");
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Sert les photos envoyées par les partenaires (stockage local du prototype). */
export async function GET(_: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(file)) return new NextResponse(null, { status: 404 });
  try {
    const buf = await fs.readFile(path.join(DIR, file));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[file.split(".").pop()!], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
