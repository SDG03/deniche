// Captures d'écran rapides : node scripts/shoot.mjs [--out dir] [--login user|partner] /chemin1 /chemin2 …
// Chaque chemin est capturé en 375 px (mobile) et 1280 px (desktop).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let out = ".work/shots";
let login = null;
let full = true;
const paths = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else if (args[i] === "--login") login = args[++i];
  else if (args[i] === "--viewport") full = false;
  else paths.push(args[i]);
}
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
for (const [label, viewport] of [
  ["375", { width: 375, height: 812 }],
  ["1280", { width: 1280, height: 800 }],
]) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: label === "375" ? 2 : 1,
    locale: "fr-BE",
    timezoneId: "Europe/Brussels",
    isMobile: label === "375",
    hasTouch: label === "375",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  if (login) {
    await page.goto(`${base}/connexion`);
    await page.getByRole("button", { name: login === "partner" ? /partenaire/i : /utilisateur/i }).click();
    await page.waitForLoadState("networkidle");
  }
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/[/?=&]+/g, "_")) + `-${label}.png`;
    await page.screenshot({ path: path.join(out, name), fullPage: full });
    console.log(`${name}${overflow > 0 ? `  ⚠ débordement horizontal ${overflow}px` : ""}`);
  }
  if (errors.length) console.log(`[${label}] erreurs:\n  ` + [...new Set(errors)].join("\n  "));
  await ctx.close();
}
await browser.close();
