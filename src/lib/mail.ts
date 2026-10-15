import "server-only";

/**
 * E-mails simulés : rien ne part, on journalise dans la console du serveur.
 * Pour brancher un vrai service, remplacer le corps de `sendMail`.
 */
export async function sendMail({ to, subject, body }: { to: string; subject: string; body: string }) {
  console.info(`\n[e-mail simulé] → ${to}\n  Objet : ${subject}\n  ${body.replace(/\n/g, "\n  ")}\n`);
}
