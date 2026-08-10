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

**État : phase 2.** Le socle est en place — schéma de données complet, authentification, wrapper
d'appel modèle, file de travaux asynchrones, plomberie de notification, identité visuelle et
tableau de bord. Les prompts de génération, leurs schémas de sortie, les fixtures de référence et
le banc d'évaluation le sont aussi. L'ingestion tourne de bout en bout : dépôt de texte ou de
capture, lecture d'image, découpage en concepts, écriture des questions en envoi groupé, écrans de
liste et de détail, correction d'un concept. Le moteur de révision arrive à la phase suivante.

## Stack

| Domaine            | Choix                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict  |
| Base de données    | PostgreSQL, Prisma 7 avec le driver adapter `@prisma/adapter-pg` |
| Authentification   | better-auth (email/mot de passe, Google en option)               |
| Répétition espacée | `ts-fsrs`                                                        |
| Modèle             | SDK Anthropic, sorties structurées contraintes, validation Zod   |
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

| Commande                   | Effet                                                     |
| -------------------------- | --------------------------------------------------------- |
| `npm run dev`              | Serveur de développement                                  |
| `npm run build`            | Build de production                                       |
| `npm run typecheck`        | `tsc --noEmit`                                            |
| `npm run lint`             | ESLint, frontières d'architecture comprises               |
| `npm test`                 | Vitest sur `lib/domain/`, propriétés fast-check comprises |
| `npm run test:watch`       | Vitest en veille                                          |
| `npm run format`           | Prettier en écriture                                      |
| `npm run db:migrate`       | `prisma migrate dev`                                      |
| `npm run db:deploy`        | `prisma migrate deploy`, pour un environnement déployé    |
| `npm run db:seed`          | Remplit la base ; rejouable sans dupliquer                |
| `npm run db:studio`        | Prisma Studio                                             |
| `npm run verify:ai`        | Vérifie les garde-fous d'appel modèle à l'exécution       |
| `npm run verify:ingestion` | Rejoue l'ingestion de bout en bout, en mode mock          |

`npm run eval:generation` existe aussi : c'est le banc d'évaluation, décrit plus bas. C'est le seul
script du dépôt qui émet de vrais appels, et il ne part pas sans qu'on le lui dise deux fois.

## Architecture

```
app/
  (marketing)/   Landing publique, page de désinscription
  (auth)/        Connexion, inscription
  (app)/         Application authentifiée
  api/           Route handlers, dont les trois routes cron
components/
  ui/            Primitives shadcn retokenisées, sans logique métier
  cairn/         L'empilement de pierres
  <domaine>/     Composants de présentation
lib/
  domain/        Logique pure : géométrie du cairn, échéances, jours locaux,
                 contrôles automatiques sur une génération
  db/            Seul endroit qui importe le client Prisma
  ai/            callAI(), envoi groupé, prompts système, schémas Zod, fixtures
  depots/        Le geste de dépôt côté serveur
  images/        Lecture et réduction d'une capture avant envoi au modèle
  auth/  email/  jobs/  cron/
prisma/
  schema/        Schéma multi-fichiers
  seed/          Corpus de démonstration
scripts/
  evaluation/    Corpus du banc, exécution, rapport
  verification/  Cas des vérifications à l'exécution
```

Le sens des dépendances est `app/` → `lib/db/` → `lib/domain/`, et il est vérifié par ESLint :
`no-restricted-imports` interdit le SDK Anthropic hors de `lib/ai/client.ts`, le client Prisma hors
de `lib/db/`, Resend hors de `lib/email/`, et tout accès à Next ou React depuis `lib/domain/`.

### Appels au modèle

`callAI()` est le seul chemin vers le modèle. Dans l'ordre : interrupteur `AI_ENABLED`, mode mock,
réservation d'une place dans le plafond journalier, appel avec `max_tokens` explicite et
`output_config.format` dérivé du schéma Zod, validation stricte de la réponse, puis écriture d'une
ligne au registre `AiCall` — succès comme échec, avec tokens, coût et latence. Aucun retry.

La forme envoyée n'est pas produite par l'assistant du SDK, qui rétrograde `enum` et `const` en
simple description : `lib/ai/output-schema.ts` dérive le schéma JSON à la main pour les conserver,
et lève plutôt que d'émettre si la forme porte un mot-clé structurel (`$ref`, `oneOf`, `if`…) que
la grammaire ne compile pas. Une forme intraduisible est une erreur de développement, pas un appel
raté : elle est détectée avant que le registre s'ouvre.

L'écriture des questions passe par l'API de traitement par lot — moitié tarif, contre une latence de
quelques minutes à quelques heures. `lib/ai/batch.ts` emprunte le client de `client.ts` sans
importer le SDK, et porte les mêmes garde-fous : interrupteur, mode mock, plafond du jour compté par
requête et réservé d'un bloc, une ligne d'`AiCall` par réponse, aucun retry.

La réservation passe par la table `AiCallQuota`, une ligne par jour UTC, et tient dans une seule
instruction qui incrémente et refuse dans le même mouvement. Compter les lignes d'`AiCall` avant
d'émettre serait une course : deux appels simultanés liraient la même valeur et passeraient tous
les deux. Une place prise n'est jamais rendue — un appel qui échoue a pu consommer des tokens.

`npm run verify:ai` pose un piège sur `fetch` et vérifie ces garde-fous à l'exécution plutôt que sur
parole.

Le raisonnement étendu reste coupé sur les trois appels : rien dans ces intentions n'a montré qu'il
servait, et le rouvrir se décidera sur une mesure. Une réponse coupée par `max_tokens` est traitée
comme un échec, jamais comme un résultat partiel — une sortie tronquée peut rester syntaxiquement
valide, et c'est l'échec qui ne se voit pas.

### Génération et banc d'évaluation

Trois prompts système vivent dans `lib/ai/prompts/`, un par intention : découper un dépôt en
concepts, écrire quatre questions sur chacun de trois concepts, lire une capture d'écran. Aucun ne
demande de répondre en JSON — la forme est portée par le schéma dérivé du Zod, et les deux ne
peuvent pas diverger. Les schémas refusent aussi les sorties qui se contredisent : un rejet sans
motif, deux lots qui portent le même rang, un QCM sans options.

Les quatre questions d'un concept arrivent sous quatre clés nommées plutôt que dans un tableau :
c'est la forme elle-même qui garantit une facette par question, sans avoir à la contrôler après
coup.

`lib/ai/fixtures/` sert de niveau de qualité, pas seulement de bouchon : les sorties y sont écrites
à la main, du dépôt d'une phrase à l'article collé, en passant par l'affirmation fausse — extraite
telle quelle et marquée douteuse — et la liste de courses, rejetée avec son motif. Le cas servi est
choisi par mot-clé, à défaut par longueur : deux exécutions sur le même dépôt rendent la même
chose.

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

### Ingestion

Un dépôt part en une action : un champ, une capture facultative, un bouton. Le serveur valide,
prend une place au quota du jour, réduit l'image s'il y en a une, écrit l'`Input` et met le travail
en file — aucun appel modèle n'a lieu dans la requête. Une clé d'envoi tirée au montage du
formulaire rend le geste idempotent : deux clics n'écrivent qu'un dépôt, et la place prise à tort
est rendue.

La suite s'enchaîne par jobs : lecture de la capture s'il y en a une, puis découpage en concepts,
puis écriture des questions. Les octets de l'image ne survivent pas à sa lecture — dès que le texte
existe, ils sont effacés dans la même écriture. Le découpage est un appel normal, parce que c'est le
retour visible du dépôt ; les questions partent en envoi groupé, par lots de trois concepts, parce
qu'elles ne servent qu'à la première révision.

Rien de ce qui a coûté un appel n'est jeté : un dépôt dont les questions échouent garde ses
concepts, et l'écran dit ce qui manque. Un concept marqué douteux par le modèle ne part pas en
génération — lui écrire des questions riverait une erreur que personne n'a vérifiée ; il attend
d'être confirmé, réécrit ou supprimé.

Deux limites bornent le geste : cinq dépôts par jour et par compte, comptés dans le calendrier de
l'utilisateur, et trois dépôts par minute pour le débit. Le plafond atteint propose une liste
d'attente plutôt qu'un mur.

### Travaux asynchrones

Une ingestion écrit un `GenerationJob` et rend la main ; `after()` déclenche le traitement une fois
la réponse envoyée. La route `GET /api/cron/jobs` reprend les travaux restés en attente et ceux dont
le processus est mort en cours de route depuis plus de dix minutes, au plus trois fois. La route
`GET /api/cron/lots` relève les envois groupés terminés puis soumet ceux qui attendent encore ; un
lot resté sans réponse au bout d'un jour rend ses jobs à la file, jamais relancé en boucle. La route
`GET /api/cron/rappels`, horaire, sélectionne les comptes dont l'heure locale correspond à leur
heure de rappel. Les trois exigent `Authorization: Bearer $CRON_SECRET`.

Quelle que soit l'étape qui échoue, un dépôt cesse d'annoncer un travail en cours : c'est la même
fonction qui referme, et elle garde les concepts déjà écrits.

## Vérification

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run verify:ai && npm run verify:ingestion
```

Les tests couvrent `lib/domain/` — logique pure, donc testable sans base ni réseau. Cinq propriétés
fast-check y tournent : trois sur des instants et des fuseaux tirés au hasard parmi ceux que la
plateforme connaît — le jour civil fait foi, `localDay` conserve l'ordre du temps, `joursAvant` est
antisymétrique — et deux sur les contrôles de génération, qui ne doivent réagir ni aux accents ni à
la ponctuation.

Le banc d'évaluation ne fait pas partie de cette commande : il dépense.

`verify:ai` vérifie à l'exécution ce qu'un test unitaire ne peut pas prouver : qu'aucune requête ne
sort en mode mock, que l'envoi groupé est borné par le même plafond que l'appel unitaire, et que ce
plafond tient quand vingt-cinq réservations partent au même instant — cette garantie-là est dans
l'atomicité d'une instruction Postgres, pas dans le code TypeScript.

`verify:ingestion` rejoue le pipeline entier sur un compte de vérification créé puis effacé : dépôt
texte et dépôt image jusqu'aux questions écrites, capture illisible, dépôt sans rien à retenir,
concept douteux puis confirmé, concept réécrit, lot perdu, échec à mi-parcours, double envoi, débit,
quota, liste d'attente. Le même piège sur `fetch` y est armé : la vérification échoue si une requête
part vers l'API.

## Licence

Repo public à des fins de portfolio dev — utilisation, reproduction ou réutilisation du code
soumises à autorisation préalable.
