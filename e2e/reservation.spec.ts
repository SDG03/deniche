import { expect, test, type Page } from "@playwright/test";

/** Le picker visible (mobile : dans le flux ; desktop : colonne de droite). */
function picker(page: Page, isMobile: boolean) {
  return page.locator(isMobile ? "section[aria-labelledby=creneaux]" : "aside");
}

test.describe("Parcours de réservation", () => {
  test("choisir une activité, un créneau, payer et recevoir le QR", async ({ page, isMobile }) => {
    // 1. Une activité depuis l'Explorer
    await page.goto("/explorer?categorie=kayak");
    await page.getByRole("link", { name: /Descente de l'Ourthe/ }).click();
    await expect(page).toHaveURL(/\/activite\/kayak-ourthe-durbuy/);
    await expect(page.getByRole("heading", { level: 1, name: /Descente de l'Ourthe/ })).toBeVisible();

    // 2. Un créneau réservable (prix affiché par créneau)
    const slots = picker(page, isMobile).getByRole("list", { name: "Créneaux" });
    const slot = slots.getByRole("button", { disabled: false }).filter({ hasText: "€" }).first();
    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Le prix baisse à l'approche du départ/).filter({ visible: true })).toBeVisible();

    // 3. Réserver → connexion démo → retour sur le créneau
    await page.getByRole("button", { name: "Réserver", exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/connexion/);
    await page.getByRole("button", { name: /Connexion démo · utilisateur/ }).click();
    await page.waitForURL((u) => u.pathname.startsWith("/activite/"));
    await expect(picker(page, isMobile).getByRole("button", { pressed: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Une personne de plus" }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Réserver", exact: true }).filter({ visible: true }).click();

    // 4. Checkout : prix verrouillé, prénoms, paiement simulé
    await page.waitForURL((u) => u.pathname.startsWith("/reserver/"));
    await expect(page.getByRole("timer")).toContainText("Prix verrouillé");
    const names = page.locator("input[name=names]");
    await expect(names).toHaveCount(2);
    await names.nth(1).fill("Sam");
    await page.getByRole("button", { name: /^Payer/ }).click();

    // 5. Confirmation avec QR, code d'arrivée et calendrier
    await page.waitForURL(/\/reservation\/.+nouveau=1/);
    await expect(page.getByRole("heading", { name: "C'est réservé !" })).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code d'arrivée/ })).toBeVisible();
    await expect(page.getByTestId("checkin-code")).toHaveText(/^[2-9A-HJKMNP-Z]{6}$/);
    const ics = await page.request.get((await page.getByRole("link", { name: "Ajouter au calendrier" }).getAttribute("href"))!);
    expect(ics.status()).toBe(200);
    expect(await ics.text()).toContain("BEGIN:VEVENT");

    // 6. Elle apparaît dans « Mes réservations »
    await page.goto("/reservations");
    await expect(page.getByRole("link", { name: /Descente de l'Ourthe/ }).first()).toBeVisible();
  });

  test("une carte refusée affiche un message clair", async ({ page, isMobile }) => {
    await page.goto("/connexion");
    await page.getByRole("button", { name: /Connexion démo · utilisateur/ }).click();
    await page.waitForURL("/");
    await page.goto("/activite/kayak-ambleve-aywaille");
    await picker(page, isMobile).getByRole("list", { name: "Créneaux" }).getByRole("button", { disabled: false }).filter({ hasText: "€" }).first().click();
    await page.getByRole("button", { name: "Réserver", exact: true }).filter({ visible: true }).click();
    await page.waitForURL((u) => u.pathname.startsWith("/reserver/"));
    await page.getByLabel("Numéro de carte").fill("4000 0000 0000 0002");
    await page.getByRole("button", { name: /^Payer/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "refusé" })).toBeVisible();
    // On peut libérer les places en changeant de créneau
    await page.getByRole("button", { name: "Changer de créneau" }).click();
    await expect(page).toHaveURL(/\/activite\/kayak-ambleve-aywaille/);
  });
});

test.describe("Découverte", () => {
  test("filtres en bottom sheet et bascule carte", async ({ page }) => {
    await page.goto("/explorer");
    await page.getByRole("button", { name: /Filtres/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtres" });
    await sheet.getByRole("button", { name: "Nature" }).click();
    await sheet.getByRole("button", { name: "Voir les résultats" }).click();
    await expect(page).toHaveURL(/categorie=nature/);
    await expect(page.getByText(/^2 activités$/)).toBeVisible();
    await page.getByRole("button", { name: "Carte" }).click();
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("Surprends-moi ouvre une activité avec un créneau présélectionné", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Surprends-moi" }).first().click();
    await expect(page).toHaveURL(/\/activite\/.+creneau=.+surprise=1/);
    await expect(page.getByText(/Tirée au sort pour toi/)).toBeVisible();
  });
});
