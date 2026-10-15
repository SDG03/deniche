/**
 * Modèles de textes légaux — À VALIDER PAR UN JURISTE avant toute mise en ligne.
 * Ils servent à montrer la structure attendue, pas à engager qui que ce soit.
 */
export type LegalDoc = { slug: string; title: string; intro: string; sections: { title: string; body: string[] }[] };

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "cgv",
    title: "Conditions générales de vente",
    intro:
      "Ces conditions encadrent l'utilisation de Déniche pour réserver une activité proposée par un prestataire partenaire.",
    sections: [
      {
        title: "1. Qui fait quoi",
        body: [
          "Déniche est une plateforme de mise en relation. Le contrat de prestation est conclu entre toi et le partenaire qui organise l'activité ; Déniche encaisse le paiement pour son compte.",
          "Identité de l'éditeur, numéro d'entreprise (BCE) et adresse : [à compléter].",
        ],
      },
      {
        title: "2. Prix",
        body: [
          "Les prix sont affichés en euros, TVA comprise, par personne. Ils peuvent baisser à l'approche du début de l'activité selon les règles fixées par chaque partenaire.",
          "Le prix appliqué est celui calculé par nos serveurs au moment où tu cliques sur « Réserver ». Il est garanti pendant 10 minutes, le temps de payer.",
          "Le nombre de places à prix réduit peut être limité par créneau. Le récapitulatif indique toujours le détail avant paiement.",
        ],
      },
      {
        title: "3. Réservation et paiement",
        body: [
          "La réservation est ferme dès la confirmation du paiement. Tu reçois une confirmation avec un code d'arrivée.",
          "Moyens de paiement : carte bancaire et Bancontact, via un prestataire de paiement certifié. [Nom du prestataire à compléter.]",
        ],
      },
      {
        title: "4. Annulation",
        body: ["Chaque activité affiche sa politique d'annulation (souple, modérée ou stricte). Voir la page Annulation et rétractation."],
      },
      {
        title: "5. Responsabilité",
        body: [
          "Le partenaire est responsable du bon déroulement de l'activité, de la sécurité et des assurances. Déniche est responsable du bon fonctionnement de la réservation.",
          "[Clauses de limitation de responsabilité à rédiger et valider.]",
        ],
      },
      {
        title: "6. Litiges",
        body: [
          "Droit belge applicable. En cas de différend, contacte-nous d'abord : [adresse de contact].",
          "Tu peux aussi recourir au Service de médiation pour le consommateur ou à la plateforme européenne de règlement en ligne des litiges. [Références à vérifier.]",
        ],
      },
    ],
  },
  {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    intro: "Ce qu'on collecte, pourquoi, et combien de temps. Rédigé pour le RGPD, à valider.",
    sections: [
      {
        title: "Données collectées",
        body: [
          "Compte : adresse e-mail, prénom. Réservations : participants (prénoms), créneaux, montants. Paiement : référence de transaction (jamais ton numéro de carte, géré par le prestataire de paiement).",
          "Position : uniquement si tu l'autorises, arrondie, stockée dans un cookie sur ton appareil pour trier les activités par distance. Elle n'est pas enregistrée sur nos serveurs.",
        ],
      },
      {
        title: "Finalités et bases légales",
        body: [
          "Exécuter ta réservation (contrat). Prévenir la fraude et tenir la comptabilité (obligation légale et intérêt légitime). Statistiques agrégées pour les partenaires, sans données nominatives (intérêt légitime).",
        ],
      },
      {
        title: "Partage",
        body: [
          "Le partenaire concerné reçoit ton nom, le nombre de participants et leurs prénoms, pour t'accueillir. Rien n'est vendu à des tiers.",
        ],
      },
      {
        title: "Conservation",
        body: ["Compte : jusqu'à sa suppression. Réservations et factures : [durée légale à vérifier, généralement 7 ans en Belgique pour les pièces comptables]."],
      },
      {
        title: "Tes droits",
        body: [
          "Accès, rectification, effacement, limitation, portabilité et opposition : écris à [adresse de contact]. Tu peux introduire une plainte auprès de l'Autorité de protection des données (APD).",
        ],
      },
      { title: "Cookies", body: ["Un cookie de session (connexion) et un cookie de position (facultatif). Pas de cookie publicitaire."] },
    ],
  },
  {
    slug: "annulation",
    title: "Annulation et droit de rétractation",
    intro: "La version courte : regarde la politique affichée sur l'activité, c'est elle qui compte.",
    sections: [
      {
        title: "Droit de rétractation",
        body: [
          "Pour les services de loisirs fournis à une date ou pendant une période précise, le droit de rétractation de 14 jours ne s'applique pas (Code de droit économique, art. VI.53, 12° — référence à faire confirmer par un juriste).",
          "C'est pour cela que chaque partenaire propose sa propre politique d'annulation, affichée avant le paiement.",
        ],
      },
      {
        title: "Les trois politiques",
        body: [
          "Souple : annulation gratuite jusqu'à 24 h avant le début, remboursement intégral.",
          "Modérée : annulation gratuite jusqu'à 72 h avant le début, remboursement intégral.",
          "Stricte : non remboursable.",
        ],
      },
      {
        title: "Annulation par le partenaire",
        body: [
          "Si le partenaire annule (météo, sécurité, imprévu), tu es remboursé intégralement, quelle que soit la politique. [Délai de remboursement à préciser.]",
        ],
      },
      {
        title: "Comment annuler",
        body: ["Dans Mes réservations, ouvre la réservation puis touche « Annuler ». Le remboursement part sur le moyen de paiement utilisé."],
      },
    ],
  },
];
