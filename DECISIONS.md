# Décisions

Choix faits en autonomie pendant la construction du prototype, avec la raison en une ou deux lignes.

## Outillage

- **Node.js 24 LTS portable** installé dans `%LOCALAPPDATA%\Programs` et ajouté au PATH utilisateur : Node n'était pas présent sur la machine, et cette installation ne demande pas de droits administrateur.
- **Next.js 16.4 (App Router) + React 19 + TypeScript strict + Tailwind CSS 4**, versions générées par `create-next-app`.
- **Cache Components désactivé** (`cacheComponents: false`) : les prix changent à la minute et la session est lue sur presque chaque page, tout est donc dynamique. Les skeletons passent par `loading.tsx`.
- **Prisma 7 + SQLite via `@prisma/adapter-libsql`** : Prisma 7 impose un adaptateur. LibSQL est livré en binaires précompilés, donc `npm install` marche sans compilation native ni script d'installation (contrairement à `better-sqlite3`). Pour passer à Postgres, il suffit de changer le `provider` et l'adaptateur (`@prisma/adapter-pg`).
- **`prisma db push` plutôt que des migrations** : un prototype sans historique à préserver. `npm run seed` crée le schéma et remplit la base en une commande.
- **`allowScripts` dans `package.json`** : npm 11 bloque les scripts d'installation non approuvés. On autorise uniquement Prisma, esbuild et unrs-resolver, nécessaires au fonctionnement.
- **Zod 4, date-fns 4 + `@date-fns/tz`** : date-fns n'a pas de locale `fr-BE`, on utilise `fr` et le fuseau `Europe/Brussels` est forcé partout via `TZDate`.

## Photos

- **Wikimedia Commons au lieu d'Unsplash ou Pexels** : Unsplash bloque les requêtes automatisées par un contrôle anti-robot, et l'API Pexels exige une clé. Commons permet un téléchargement sans clé et des licences claires. On garde seulement CC0, domaine public, CC BY et CC BY-SA, avec l'auteur, la licence et la source dans `public/images/activities/CREDITS.md` et sous chaque photo de la fiche.
- Les photos ont été choisies à la main sur planches contact (`scripts/fetch-images.py`, sélection dans `scripts/image-picks.json`), en 1280 px. Aucune ne montre une enseigne réelle de prestataire belge.
- **Repli hors-ligne** : si les photos manquent, le seed utilise des couvertures SVG générées par catégorie (`public/images/covers/`).

## Produit et tarification

- **Paliers comptés en heures réelles** (différence entre deux instants UTC) : un créneau garde le bon palier lors du changement d'heure du 25/10/2026 (testé).
- **Bonus de remplissage** : il s'ajoute au palier, est plafonné par le plancher et ne s'applique pas à 40 % de remplissage pile (« moins de 40 % »). La règle « plus de 80 % » est stricte : à 80 % pile, la réduction s'applique encore.
- **Quota de places réduites** : pour un groupe qui dépasse les places réduites restantes, seules ces places sont réduites et les autres sont au plein tarif. Le récapitulatif l'explique.
- **Arrondi** : au 0,50 € le plus proche, puis remonté au 0,50 € supérieur s'il passe sous le plancher. Pas d'arrondi quand il n'y a pas de réduction (le prix de base reste exact).
- **« Prochain palier »** : on annonce le prochain changement de réduction à remplissage constant, et seulement s'il tombe avant la fermeture des réservations.
- **Verrou de 10 min** : les places sont bloquées dès le clic sur « Réserver » (statut `PENDING`) et libérées à l'expiration, de façon paresseuse à chaque lecture de l'inventaire. Cela évite de vendre une place à quelqu'un qui est déjà en train de payer.
- **Concurrence** : la réservation fait un `UPDATE … WHERE bookedCount <= capacité − n`, conditionnel et atomique, dans une transaction. Deux clients ne peuvent pas obtenir la même dernière place.
- **Créneaux** : générés à partir d'un modèle hebdomadaire par activité. L'inventaire est complété automatiquement sur 21 jours glissants, donc la démo reste utilisable même si on la lance des semaines après le seed.
- **Temps de trajet** : estimé (vol d'oiseau × 1,3, 30 km/h en ville puis 70 km/h), et présenté comme une estimation. Pas de service de calcul d'itinéraire.
- **Position par défaut** : place Saint-Lambert à Liège quand la géolocalisation est refusée. La position est stockée dans un cookie pour que le serveur puisse trier par distance.
- **Prestataires réels** : aucun n'apparaît dans l'interface. Les 5 partenaires de la démo sont fictifs et suffixés « (démo) ». La liste de prospection, corrigée, est dans `data/partenaires-candidats.json`. Correction notable : Durbuy est sur l'Ourthe, pas sur la Lesse.

## Roue de la chance et fidélité (ajout après la v1)

- **Tirage côté serveur** : la roue n'est qu'une animation. Le serveur choisit l'activité, comme avant, et la roue « atterrit » dessus. Le résultat ne dépend donc pas du client.
- **Tampon à l'arrivée, pas à la réservation** : on récompense les gens qui viennent vraiment, et une réservation annulée ne fait pas gagner de tampon.
- **Cadeaux sans impact sur le prix** (boisson, en-cas, souvenir) : pas d'interaction avec la tarification dynamique ni avec le quota. Qui finance le cadeau (partenaire ou Déniche) reste à décider avec les partenaires.
- **Un cadeau n'est accordé qu'une fois** : contrainte unique (utilisateur, rang), donc deux validations simultanées ne créent pas de doublon.

