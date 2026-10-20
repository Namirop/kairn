<h1 align="center">Kairn</h1>

<p align="center">
  Retenir ce qu'on lit, sans écrire de fiches. On dépose une information brute, Kairn la découpe en
  concepts, en tire des questions et les repose au moment où on allait l'oublier.<br>
  <a href="https://kairn.me">kairn.me</a>
</p>

<p align="center">
  <a href="https://github.com/Namirop/kairn/actions/workflows/ci.yml"><img src="https://github.com/Namirop/kairn/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL et Prisma">
</p>

<p align="center">
  <img src="docs/images/01-couverture.jpg" alt="Kairn : retenir ce qu'on lit, sans écrire de fiches" width="100%">
</p>

<p align="center">
  <img src="docs/images/02-depot.jpg" alt="Essai sans compte : un texte découpé en concepts et questions" width="32%">
  <img src="docs/images/03-revision.jpg" alt="Session de révision" width="32%">
  <img src="docs/images/04-suivi.jpg" alt="Concepts du jour et dépôts" width="32%">
</p>

## Ce que fait Kairn

On dépose ce qu'on veut retenir : une phrase, un article collé, une capture d'écran. Un modèle de
langage le découpe en **concepts** (`Atom`) et écrit pour chacun **quatre questions** (`Variant`) qui
l'interrogent sous des angles différents. La répétition espacée (FSRS) planifie le concept, jamais
la question : les formulations tournent pour qu'on retienne l'idée, pas une phrase.

- **Essai sans compte** : la page d'accueil découpe un vrai texte avant de demander quoi que ce
  soit.
- **Session du jour** et **entraînement libre**, qui ne touche pas à la mémoire.
- **Connexion par code** envoyé par email, sans mot de passe. Export et suppression du compte en
  libre-service.
- **Offre payante** par Stripe (Checkout et portail), droits accordés par le webhook signé.
- Interface en **français et en anglais**, installable comme application (PWA).

## Stack

| Domaine            | Choix                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Application        | Next.js 16 (App Router), React 19, TypeScript strict                         |
| Données            | PostgreSQL (Neon), Prisma 7                                                  |
| Modèle de langage  | OpenRouter, repli automatique sur Claude Sonnet, sorties validées par Zod    |
| Répétition espacée | ts-fsrs                                                                      |
| Authentification   | better-auth (code par email, Google en option)                               |
| Interface          | Tailwind v4, primitives shadcn/ui retokenisées, Motion                       |
| Services           | Resend (emails), Stripe (paiement), Vercel (hébergement, mesure sans cookie) |

## Démarrer

Prérequis : Node.js 24 (voir `.nvmrc`) et une base PostgreSQL 16+. Aucune clé de modèle n'est
nécessaire : en développement, `MOCK_AI=true` sert des réponses écrites à la main, et tout le
pipeline tourne sans un seul appel réel.

```bash
git clone https://github.com/Namirop/kairn.git && cd kairn
npm install
cp .env.example .env    # renseigner DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
npm run db:migrate
npm run db:seed         # un compte de démonstration avec deux mois d'historique
npm run dev
```

Sans clé Resend, le code de connexion s'affiche dans les journaux du serveur : on entre dans le
compte de démonstration sans configurer d'email. Les variables d'environnement sont décrites dans
[`docs/environnements.md`](docs/environnements.md).

## Commandes

| Commande             | Effet                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `npm run dev`        | Serveur de développement                                           |
| `npm test`           | Tests unitaires et propriétés (Vitest, fast-check)                 |
| `npm run lint`       | ESLint, frontières d'architecture comprises                        |
| `npm run typecheck`  | TypeScript                                                         |
| `npm run knip`       | Code mort : fichiers, exports et dépendances inutilisés            |
| `npm run docs:check` | Docs dont le code a changé sur la branche                          |
| `npm run verifier:*` | Vérifications contre une vraie base : garde-fous, ingestion, abus… |

La liste complète, et la logique qui la range, est dans [`docs/outillage.md`](docs/outillage.md).

## Architecture

```
app/          Routes Next.js : landing, application, API (cron, webhook, export)
components/   Interface, par domaine ; components/ui/ pour les primitives
lib/
  domain/     Logique métier pure, sans Next ni Prisma : c'est là qu'elle se teste
  db/         Seul accès à la base
  ai/         Seul accès au modèle : callAI(), prompts, schémas, fixtures
  …           auth, email, jobs, paiement, i18n
prisma/       Schéma, migrations, seed
scripts/      Vérifications, maintenance, banc d'évaluation des modèles
```

Les dépendances vont dans un seul sens, `app/` → `lib/db/` → `lib/domain/`, et ESLint le fait
respecter. Tout appel au modèle passe par `callAI()`, qui porte les garde-fous de budget : mode
mock, plafonds journaliers (global, par compte, sans compte), validation de la sortie, registre de
chaque appel avec son coût. Aucune génération n'a lieu pendant une requête : un dépôt écrit un job
et rend la main.

Le détail est dans [`docs/architecture.md`](docs/architecture.md).

## Choisir le modèle sur mesure, pas sur réputation

Le modèle en production n'a pas été choisi sur sa notoriété. `scripts/evaluation/` est un banc
qui passe le même corpus de dépôts (texte court, article long, capture d'écran, affirmation fausse,
opinion à rejeter, langue étrangère…) à plusieurs modèles et mesure ce qui se vérifie : concepts
manqués ou inventés, doublons, fidélité des questions, formats. Un juge d'une autre lignée note
les sorties, et la règle de décision a été écrite avant de voir les chiffres. Deux campagnes,
extraction puis questions, ont retenu le même challenger. Il remplace Claude Sonnet à moins d'un
dixième du prix catalogue, sans perte mesurée. Le protocole est dans
[`docs/campagne-modeles.md`](docs/campagne-modeles.md).

## Qualité

- **CI sur chaque PR** : lint, types, format, tests, code mort (knip) et build. `main` est protégée :
  rien n'y entre sans PR verte.
- **Hooks git** (husky) : format au commit, message au format Conventional Commits, types et tests
  au push.
- **Tests sur la logique pure**, avec des **propriétés** fast-check pour les règles vraies sur toute
  entrée, et un fuseau horaire fixé à UTC+5:45 pour qu'aucun test ne dépende de la machine.
- **Vérifications d'exécution** contre une vraie base : plafonds sous concurrence, propriété des
  ressources entre comptes, suppression de compte sans reste.
- **Des docs qui suivent le code** : chaque doc déclare le code qu'elle décrit, et `docs:check`
  signale celles à relire quand ce code change.
- **Des commentaires qui disent pourquoi** le code est comme il est, jamais son histoire.

Les conventions de travail sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentation

| Document                                           | Contenu                                                  |
| -------------------------------------------------- | -------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)     | Appels au modèle, ingestion, essai sans compte, révision |
| [`docs/deploiement.md`](docs/deploiement.md)       | Mise en ligne, crons, emails, retour arrière             |
| [`docs/environnements.md`](docs/environnements.md) | Variables d'environnement, dev et production             |
| [`docs/paiement.md`](docs/paiement.md)             | Stripe, webhook, TVA                                     |
| [`docs/outillage.md`](docs/outillage.md)           | Commandes, étages de vérification                        |
| [`DESIGN.md`](DESIGN.md)                           | Système visuel                                           |

Le code est en français, sauf le vocabulaire du domaine et ce qu'imposent les outils : le produit
est francophone, et ce choix est écrit dans les conventions.

## Licence

Repo public à des fins de portfolio. Utilisation, reproduction ou réutilisation du code soumises à
autorisation préalable.
