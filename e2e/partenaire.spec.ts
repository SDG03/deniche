import { expect, test } from "@playwright/test";

test("un partenaire crée une activité, règle ses réductions et valide une arrivée", async ({ browser, page }) => {
  const title = `Atelier sérigraphie ${Date.now().toString().slice(-5)}`;

  // Connexion partenaire
  await page.goto("/connexion");
  await page.getByRole("button", { name: /Connexion démo · partenaire/ }).click();
  await page.waitForURL("/partenaire");
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

  // Création
  await page.goto("/partenaire/activites/nouvelle");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Accroche").fill("Ton propre t-shirt, imprimé à la main.");
  await page.getByLabel("Catégorie").selectOption("atelier");
  await page
    .getByLabel("Description")
    .fill(
      "Tu choisis un motif, tu prépares l'écran, tu tires ta première impression. Tu repars avec un t-shirt unique.",
    );
  await page.getByLabel("Adresse").fill("Rue de la Chapelle 10, 4800 Verviers");
  await page.getByLabel("Localité").fill("Verviers");
  await page.getByLabel("Prix (€/pers.)").fill("32");
  await page.getByRole("button", { name: "Créer l'activité" }).click();
  await page.waitForURL(/cree=1/);
  const id = page.url().match(/activites\/([^?]+)/)![1];

  // Réductions : courbe et enregistrement
  await page.goto(`/partenaire/activites/${id}?onglet=tarifs`);
  await expect(page.getByRole("img", { name: /Courbe de prix/ })).toBeVisible();
  await page.getByLabel("Réduction du palier 5 en pourcent").fill("35");
  await expect(page.getByRole("cell", { name: "moins de 2 h avant" })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les règles" }).click();
  await expect(page.getByRole("status")).toContainText("Règles enregistrées");

  // Un client réserve l'activité
  const client = await browser.newContext({
    locale: "fr-BE",
    timezoneId: "Europe/Brussels",
    viewport: { width: 375, height: 812 },
  });
  const c = await client.newPage();
  await c.goto("/connexion");
  await c.getByRole("button", { name: /Connexion démo · utilisateur/ }).click();
  await c.waitForURL("/");
  await c.goto(`/explorer?q=${encodeURIComponent(title)}`);
  await c.getByRole("link", { name: title }).click();
  await c
    .locator("section[aria-labelledby=creneaux]")
    .getByRole("list", { name: "Créneaux" })
    .getByRole("button", { disabled: false })
    .first()
    .click();
  await c.getByRole("button", { name: "Réserver", exact: true }).filter({ visible: true }).click();
  await c.waitForURL((u) => u.pathname.startsWith("/reserver/"));
  await c.getByRole("button", { name: /^Payer/ }).click();
  await c.waitForURL(/nouveau=1/);
  const code = (await c.getByTestId("checkin-code").textContent())!.trim();
  await client.close();

  // Le partenaire la voit arriver, puis valide l'arrivée avec le code
  await page.goto("/partenaire/reservations");
  const row = page.getByRole("listitem").filter({ hasText: title }).first();
  await expect(row.getByText("Nouveau")).toBeVisible();
  await page.goto("/partenaire/accueil");
  await page.getByLabel(/Code d'arrivée/).fill(code.toLowerCase());
  await page.getByRole("button", { name: "Chercher" }).click();
  await expect(page.getByText("Réservation valide")).toBeVisible();
  await page.getByRole("button", { name: /Valider l'arrivée/ }).click();
  await expect(page.getByText(/Arrivée validée/)).toBeVisible();

  // Statistiques visibles
  await page.goto("/partenaire");
  for (const label of ["Taux de remplissage", "Chiffre d'affaires", "Réservations dernière minute"]) {
    await expect(page.getByText(label)).toBeVisible();
  }
});
