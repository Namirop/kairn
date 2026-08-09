# Cairn

> Application de répétition espacée : on y dépose une information brute, elle est découpée en
> concepts, transformée en questions, et reposée au moment où elle est sur le point d'être oubliée.

## Aperçu

Cairn prend un dépôt libre — une phrase, un pavé collé, une capture d'écran — et en tire des
concepts unitaires (`Atom`). Chaque concept porte trois à quatre formulations de question
(`Variant`) de formats différents. La planification par répétition espacée porte sur le concept, pas
sur la formulation : les formulations tournent pour éviter de mémoriser une tournure plutôt qu'une
idée.

Le découpage et la génération de questions passent par un modèle de langage, derrière un unique
point d'entrée `callAI()` qui porte les garde-fous de budget. En développement, un mode mock rend
des fixtures : toute l'interface et tout le pipeline se développent sans un seul appel réel.

**État : phase 0.** Le socle est en place — schéma de données complet, authentification, wrapper
d'appel modèle, file de travaux asynchrones, plomberie de notification, identité visuelle et
tableau de bord branché sur le seed. L'ingestion, la génération et le moteur de révision arrivent
dans les phases suivantes ; les traitements de jobs sont des coquilles vides.

## Stack

| Domaine        | Choix                                                              |
| -------------- | ------------------------------------------------------------------ |
| Framework      | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict     |
| Base de données| PostgreSQL, Prisma 7 avec le driver adapter `@prisma/adapter-pg`    |
| Authentification | better-auth (email/mot de passe, Google en option)                |
| Répétition espacée | `ts-fsrs`                                                       |
| Modèle         | SDK Anthropic, sorties structurées par tool use, validation Zod     |
| Interface      | Tailwind v4, primitives shadcn/ui retokenisées, Motion              |
| Email          | Resend                                                              |

## Prérequis

- Node.js 20 ou plus récent
- Une base PostgreSQL 16+ accessible (le projet est développé sur Neon)
- Facultatif : compte Resend, identifiants OAuth Google, clé API Anthropic — l'application démarre
  et se développe sans aucun des trois

## Installation

```bash
git clone https://github.com/Namirop/cairn.git
cd cairn
npm install                 # `postinstall` génère le client Prisma
cp .env.example .env        # puis renseigner au minimum DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
npm run db:migrate          # applique la migration initiale
npm run db:seed             # remplit la base avec un compte de démonstration
npm run dev
```

Le compte créé par le seed et son mot de passe sont définis dans `prisma/seed/account.ts`, et
surchargeables par `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`.

## Variables d'environnement

| Nom                   | Requis | Description                                                              |
| --------------------- | ------ | ------------------------------------------------------------------------ |
| `DATABASE_URL`        | oui    | Connexion applicative. Sur Neon, l'endpoint poolé.                       |
| `DIRECT_URL`          | oui    | Connexion directe, sans pooler. Utilisée par Migrate et par le seed.     |
| `BETTER_AUTH_SECRET`  | oui    | Signature des sessions, et des jetons de désinscription.                 |
| `BETTER_AUTH_URL`     | oui    | URL publique de l'application, sans slash final.                         |
| `GOOGLE_CLIENT_ID`    | non    | Sans lui et son secret, le fournisseur Google n'est simplement pas proposé. |
| `GOOGLE_CLIENT_SECRET`| non    | Voir ci-dessus.                                                          |
| `ANTHROPIC_API_KEY`   | non    | Inutile tant que `MOCK_AI=true`.                                         |
| `RESEND_API_KEY`      | non    | Sans elle, les emails sont journalisés au lieu d'être envoyés.           |
| `EMAIL_FROM`          | non    | Expéditeur des emails transactionnels.                                   |
| `CRON_SECRET`         | oui    | Jeton `Authorization: Bearer` des routes cron.                           |
| `MOCK_AI`             | oui    | `true` sert des fixtures locales, sans aucune requête réseau.            |
| `AI_ENABLED`          | oui    | `false` fait échouer immédiatement tout appel modèle.                    |
| `AI_DAILY_CALL_CAP`   | oui    | Plafond global d'appels réels par jour, vérifié avant émission.          |
| `AI_MODEL`            | oui    | Identifiant du modèle.                                                   |
| `AI_MAX_TOKENS`       | oui    | `max_tokens` par défaut ; il est toujours envoyé explicitement.          |
| `SEED_USER_*`         | non    | Adresse, mot de passe et fuseau du compte de démonstration.              |

Les valeurs réelles vivent dans `.env`, qui n'est pas versionné. `.env.example` sert de référence.

## Scripts

| Commande             | Effet                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `npm run dev`        | Serveur de développement                                          |
| `npm run build`      | Build de production                                               |
| `npm run typecheck`  | `tsc --noEmit`                                                    |
| `npm run lint`       | ESLint, frontières d'architecture comprises                       |
| `npm run format`     | Prettier en écriture                                              |
| `npm run db:migrate` | `prisma migrate dev`                                              |
| `npm run db:deploy`  | `prisma migrate deploy`, pour un environnement déployé            |
| `npm run db:seed`    | Remplit la base ; rejouable sans dupliquer                        |
| `npm run db:studio`  | Prisma Studio                                                     |
| `npm run verify:ai`  | Vérifie les garde-fous d'appel modèle à l'exécution               |

## Architecture

```
app/
  (marketing)/   Landing publique, page de désinscription
  (auth)/        Connexion, inscription
  (app)/         Application authentifiée
  api/           Route handlers, dont les deux routes cron
components/
  ui/            Primitives shadcn retokenisées, sans logique métier
  cairn/         L'empilement de pierres
  <domaine>/     Composants de présentation
lib/
  domain/        Logique pure : géométrie du cairn, échéances, jours locaux
  db/            Seul endroit qui importe le client Prisma
  ai/            callAI(), schémas Zod, fixtures
  auth/  email/  jobs/  cron/
prisma/
  schema/        Schéma multi-fichiers
  seed/          Corpus de démonstration
```

Le sens des dépendances est `app/` → `lib/db/` → `lib/domain/`, et il est vérifié par ESLint :
`no-restricted-imports` interdit le SDK Anthropic hors de `lib/ai/client.ts`, le client Prisma hors
de `lib/db/`, Resend hors de `lib/email/`, et tout accès à Next ou React depuis `lib/domain/`.

### Appels au modèle

`callAI()` est le seul chemin vers le modèle. Dans l'ordre : interrupteur `AI_ENABLED`, mode mock,
plafond journalier lu dans la table `AiCall` avant toute émission, appel avec `max_tokens` explicite
et sortie structurée par tool use dérivée du schéma Zod, validation stricte de la réponse, puis
écriture d'une ligne au registre — succès comme échec, avec tokens, coût et latence. Aucun retry.

`npm run verify:ai` pose un piège sur `fetch` et vérifie ces garde-fous à l'exécution plutôt que sur
parole.

### Travaux asynchrones

Une ingestion écrit un `GenerationJob` et rend la main ; `after()` déclenche le traitement une fois
la réponse envoyée. La route `GET /api/cron/jobs` reprend les travaux restés en attente et ceux dont
le processus est mort en cours de route depuis plus de dix minutes, au plus trois fois. La route
`GET /api/cron/rappels`, horaire, sélectionne les comptes dont l'heure locale correspond à leur
heure de rappel. Les deux exigent `Authorization: Bearer $CRON_SECRET`.

## Vérification

Il n'y a pas encore de suite de tests unitaires. L'état du projet se vérifie par :

```bash
npm run typecheck && npm run lint && npm run build && npm run verify:ai
```

## Licence

Repo public à des fins de portfolio dev — utilisation, reproduction ou réutilisation du code
soumises à autorisation préalable.
