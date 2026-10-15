// Captures pour le README : node scripts/capture-docs.mjs (serveur lancé sur :3000)
// Produit docs/screens/<nom>-mobile.png (375 px @2x) et <nom>-desktop.png (1280 px).
import { chromium } from "@playwright/test";
import fs from "node:fs";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screens";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const VIEWPORTS = {
  mobile: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

async function context(kind, role) {
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], locale: "fr-BE", timezoneId: "Europe/Brussels" });
  // Masque l'indicateur de développement de Next.js sur les captures.
  await ctx.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
  });
  const page = await ctx.newPage();
  if (role) {
    await page.goto(`${B}/connexion`);
    await page.getByRole("button", { name: role === "partner" ? /partenaire/ : /utilisateur/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
  }
  return { ctx, page };
}

async function shot(page, name, kind, { scrollTo, wait = 600 } = {}) {
  if (scrollTo) {
    await page.evaluate((sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 64);
    }, scrollTo);
  }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}-${kind}.png` });
  console.log(`${name}-${kind}.png`);
}

for (const kind of ["mobile", "desktop"]) {
  const { ctx, page } = await context(kind, "user");
  await page.goto(`${B}/`, { waitUntil: "networkidle" });
  await shot(page, "01-accueil", kind);
  await shot(page, "02-derniere-minute", kind, { scrollTo: "#lastminute" });
  await page.goto(`${B}/explorer`, { waitUntil: "networkidle" });
  await shot(page, "03-explorer", kind);
  await page.getByRole("button", { name: /Filtres/ }).click();
  await shot(page, "04-filtres", kind, { wait: 400 });
  await page.keyboard.press("Escape");
  await page.goto(`${B}/explorer?vue=carte`, { waitUntil: "networkidle" });
  await shot(page, "05-carte", kind, { wait: 2500 });
  await page.goto(`${B}/activite/kayak-ourthe-durbuy`, { waitUntil: "networkidle" });
  await shot(page, "06-fiche", kind);
  const picker = page.locator(kind === "mobile" ? "section[aria-labelledby=creneaux]" : "aside");
  await picker.getByRole("list", { name: "Créneaux" }).getByRole("button", { disabled: false }).filter({ hasText: "€" }).first().click();
  await shot(page, "07-creneaux", kind, { scrollTo: kind === "mobile" ? "#creneaux" : null });
  await page.getByRole("button", { name: "Une personne de plus" }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Réserver", exact: true }).filter({ visible: true }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/reserver/"));
  await page.locator("input[name=names]").nth(1).fill("Sam");
  await shot(page, "08-paiement", kind);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await page.waitForURL(/nouveau=1/);
  await shot(page, "09-confirmation", kind, { wait: 900 });
  await page.goto(`${B}/reservations`, { waitUntil: "networkidle" });
  await shot(page, "10-reservations", kind);
  await ctx.close();

  const partner = await context(kind, "partner");
  const p = partner.page;
  await p.goto(`${B}/partenaire`, { waitUntil: "networkidle" });
  await shot(p, "11-partenaire-tableau", kind);
  await p.goto(`${B}/partenaire/activites`, { waitUntil: "networkidle" });
  await p.getByRole("link", { name: /Descente de l'Ourthe/ }).click();
  await p.waitForURL(/activites\/.+/);
  const url = p.url().split("?")[0];
  await p.goto(`${url}?onglet=tarifs`, { waitUntil: "networkidle" });
  await shot(p, "12-partenaire-reductions", kind, { scrollTo: kind === "mobile" ? "#curve-title" : null });
  await p.goto(`${url}?onglet=creneaux`, { waitUntil: "networkidle" });
  await shot(p, "13-partenaire-creneaux", kind);
  await p.goto(`${B}/partenaire/accueil`, { waitUntil: "networkidle" });
  await shot(p, "14-partenaire-accueil", kind);
  await partner.ctx.close();
}
await browser.close();
