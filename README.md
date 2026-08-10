# Cairn

> Application de répétition espacée : on y dépose une information brute, elle est découpée en
> concepts, transformée en questions, et reposée au moment où elle est sur le point d'être oubliée.

## Aperçu

Cairn prend un dépôt libre — une phrase, un pavé collé, une capture d'écran — et en tire des
concepts unitaires (`Atom`). Chaque concept porte quatre formulations de question (`Variant`), une
par facette : reconnaître, expliquer le mécanisme, délimiter, appliquer. La planification par
répétition espacée porte sur le concept, pas sur la formulation : les formulations tournent pour
éviter de mémoriser une tournure plutôt qu'une idée, et c'est la facette qui fait tourner, pas le
format.

Le découpage et la génération de questions passent par un modèle de langage, derrière un unique
point d'entrée `callAI()` qui porte les garde-fous de budget. En développement, un mode mock rend
des fixtures : toute l'interface et tout le pipeline se développent sans un seul appel réel.

**État : phase 1.** Le socle est en place — schéma de données complet, authentification, wrapper
d'appel modèle, file de travaux asynchrones, plomberie de notification, identité visuelle et
tableau de bord branché sur le seed. Les prompts de génération, leurs schémas de sortie, les
fixtures de référence et le banc d'évaluation le sont aussi. L'ingestion et le moteur de révision
arrivent dans les phases suivantes ; les traitements de jobs sont des coquilles vides.

## Stack

| Domaine            | Choix                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict  |
| Base de données    | PostgreSQL, Prisma 7 avec le driver adapter `@prisma/adapter-pg` |
| Authentification   | better-auth (email/mot de passe, Google en option)               |
| Répétition espacée | `ts-fsrs`                                                        |
| Modèle             | SDK Anthropic, sorties structurées par tool use, validation Zod  |
| Interface          | Tailwind v4, primitives shadcn/ui retokenisées, Motion           |
| Email              | Resend                                                           |

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
npm run db:migrate          # applique les migrations
npm run db:seed             # remplit la base avec un compte de démonstration
npm run dev
```

Le compte créé par le seed et son mot de passe sont définis dans `prisma/seed/account.ts`, et
surchargeables par `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`.

## Variables d'environnement

| Nom                    | Requis | Description                                                                 |
| ---------------------- | ------ | --------------------------------------------------------------------------- |
| `DATABASE_URL`         | oui    | Connexion applicative. Sur Neon, l'endpoint poolé.                          |
| `DIRECT_URL`           | oui    | Connexion directe, sans pooler. Utilisée par Migrate et par le seed.        |
| `BETTER_AUTH_SECRET`   | oui    | Signature des sessions, et des jetons de désinscription.                    |
| `BETTER_AUTH_URL`      | oui    | URL publique de l'application, sans slash final.                            |
| `GOOGLE_CLIENT_ID`     | non    | Sans lui et son secret, le fournisseur Google n'est simplement pas proposé. |
| `GOOGLE_CLIENT_SECRET` | non    | Voir ci-dessus.                                                             |
| `ANTHROPIC_API_KEY`    | non    | Inutile tant que `MOCK_AI=true`.                                            |
| `RESEND_API_KEY`       | non    | Sans elle, les emails sont journalisés au lieu d'être envoyés.              |
| `EMAIL_FROM`           | non    | Expéditeur des emails transactionnels.                                      |
| `CRON_SECRET`          | oui    | Jeton `Authorization: Bearer` des routes cron.                              |
| `MOCK_AI`              | oui    | `true` sert des fixtures locales, sans aucune requête réseau.               |
| `AI_ENABLED`           | oui    | `false` fait échouer immédiatement tout appel modèle.                       |
| `AI_DAILY_CALL_CAP`    | oui    | Plafond global d'appels réels par jour, vérifié avant émission.             |
| `AI_MODEL`             | oui    | Identifiant du modèle.                                                      |
| `AI_MAX_TOKENS`        | oui    | `max_tokens` par défaut, toujours envoyé ; une sortie coupée est un échec.  |
| `SEED_USER_*`          | non    | Adresse, mot de passe et fuseau du compte de démonstration.                 |

Les valeurs réelles vivent dans `.env`, qui n'est pas versionné. `.env.example` sert de référence.

## Scripts

| Commande             | Effet                                                     |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Serveur de développement                                  |
| `npm run build`      | Build de production                                       |
| `npm run typecheck`  | `tsc --noEmit`                                            |
| `npm run lint`       | ESLint, frontières d'architecture comprises               |
| `npm test`           | Vitest sur `lib/domain/`, propriétés fast-check comprises |
| `npm run test:watch` | Vitest en veille                                          |
| `npm run format`     | Prettier en écriture                                      |
| `npm run db:migrate` | `prisma migrate dev`                                      |
| `npm run db:deploy`  | `prisma migrate deploy`, pour un environnement déployé    |
| `npm run db:seed`    | Remplit la base ; rejouable sans dupliquer                |
| `npm run db:studio`  | Prisma Studio                                             |
| `npm run verify:ai`  | Vérifie les garde-fous d'appel modèle à l'exécution       |

`npm run eval:generation` existe aussi : c'est le banc d'évaluation, décrit plus bas. C'est le seul
script du dépôt qui émet de vrais appels, et il ne part pas sans qu'on le lui dise deux fois.

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
  domain/        Logique pure : géométrie du cairn, échéances, jours locaux,
                 contrôles automatiques sur une génération
  db/            Seul endroit qui importe le client Prisma
  ai/            callAI(), prompts système, schémas Zod, fixtures
  auth/  email/  jobs/  cron/
prisma/
  schema/        Schéma multi-fichiers
  seed/          Corpus de démonstration
scripts/
  evaluation/    Corpus du banc, exécution, rapport
```

Le sens des dépendances est `app/` → `lib/db/` → `lib/domain/`, et il est vérifié par ESLint :
`no-restricted-imports` interdit le SDK Anthropic hors de `lib/ai/client.ts`, le client Prisma hors
de `lib/db/`, Resend hors de `lib/email/`, et tout accès à Next ou React depuis `lib/domain/`.

### Appels au modèle

`callAI()` est le seul chemin vers le modèle. Dans l'ordre : interrupteur `AI_ENABLED`, mode mock,
réservation d'une place dans le plafond journalier, appel avec `max_tokens` explicite et sortie
structurée par tool use dérivée du schéma Zod, validation stricte de la réponse, puis écriture
d'une ligne au registre `AiCall` — succès comme échec, avec tokens, coût et latence. Aucun retry.

La réservation passe par la table `AiCallQuota`, une ligne par jour UTC, et tient dans une seule
instruction qui incrémente et refuse dans le même mouvement. Compter les lignes d'`AiCall` avant
d'émettre serait une course : deux appels simultanés liraient la même valeur et passeraient tous
les deux. Une place prise n'est jamais rendue — un appel qui échoue a pu consommer des tokens.

`npm run verify:ai` pose un piège sur `fetch` et vérifie ces garde-fous à l'exécution plutôt que sur
parole.

Le raisonnement étendu reste coupé sur les trois appels : la garantie de sortie structurée repose
sur un `tool_choice` qui force un outil précis, et le raisonnement ne s'y ajoute pas. Une réponse
coupée par `max_tokens` est traitée comme un échec, jamais comme un résultat partiel — un bloc
d'outil tronqué peut rester syntaxiquement valide, et c'est l'échec qui ne se voit pas.

### Génération et banc d'évaluation

Trois prompts système vivent dans `lib/ai/prompts/`, un par intention : découper un dépôt en
concepts, écrire quatre questions sur un concept, lire une capture d'écran. Aucun ne demande de
répondre en JSON — la forme est portée par l'outil dérivé du schéma Zod, et les deux ne peuvent pas
diverger. Les schémas refusent aussi les sorties qui se contredisent : un rejet sans motif, quatre
questions qui répètent une facette, un QCM sans options.

`lib/ai/fixtures/` sert de niveau de qualité, pas seulement de bouchon : les sorties y sont écrites
à la main pour huit cas, du dépôt d'une phrase à l'article collé, en passant par l'affirmation
fausse — extraite telle quelle et marquée douteuse — et la note d'organisation, rejetée avec son
motif.

`npm run eval:generation` fait passer un corpus de dépôts (`scripts/evaluation/corpus/`) au vrai
modèle et écrit un rapport lisible : par dépôt les concepts extraits, par concept ses quatre
questions et leur facette. Des contrôles automatiques signalent ce qui se vérifie sans jugement
humain — renvoi hors du concept, facettes répétées ou servies dans le désordre, options de QCM aux
longueurs déséquilibrées, réponse recopiée dans l'énoncé. Le coût du passage se lit au registre
`AiCall`. Le reste — est-ce que la question est bonne — se juge à l'œil.

C'est le seul endroit du dépôt autorisé à dépenser. Il exige `MOCK_AI=false` explicitement, annonce
le nombre d'appels qu'il va émettre, et ne part qu'à l'appel de `--emettre` :

```bash
MOCK_AI=false npm run eval:generation             # affiche le plan et s'arrête
MOCK_AI=false npm run eval:generation -- --emettre
```

### Travaux asynchrones

Une ingestion écrit un `GenerationJob` et rend la main ; `after()` déclenche le traitement une fois
la réponse envoyée. La route `GET /api/cron/jobs` reprend les travaux restés en attente et ceux dont
le processus est mort en cours de route depuis plus de dix minutes, au plus trois fois. La route
`GET /api/cron/rappels`, horaire, sélectionne les comptes dont l'heure locale correspond à leur
heure de rappel. Les deux exigent `Authorization: Bearer $CRON_SECRET`.

## Vérification

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run verify:ai
```

Les tests couvrent `lib/domain/` — logique pure, donc testable sans base ni réseau. Cinq propriétés
fast-check y tournent : trois sur des instants et des fuseaux tirés au hasard parmi ceux que la
plateforme connaît — le jour civil fait foi, `localDay` conserve l'ordre du temps, `joursAvant` est
antisymétrique — et deux sur les contrôles de génération, qui ne doivent réagir ni aux accents ni à
la ponctuation.

Le banc d'évaluation ne fait pas partie de cette commande : il dépense.

`verify:ai` vérifie à l'exécution ce qu'un test unitaire ne peut pas prouver : qu'aucune requête ne sort
en mode mock, et que le plafond journalier tient quand vingt-cinq réservations partent au même
instant — cette garantie-là est dans l'atomicité d'une instruction Postgres, pas dans le code
TypeScript.

## Licence

Repo public à des fins de portfolio dev — utilisation, reproduction ou réutilisation du code
soumises à autorisation préalable.
