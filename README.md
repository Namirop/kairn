<h1 align="center">Kairn</h1>

<p align="center">
  Application de répétition espacée : on y dépose une information brute, elle est découpée en
  concepts, transformée en questions, et reposée au moment où elle est sur le point d'être oubliée.<br>
  <a href="https://kairn.me">kairn.me</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/OpenRouter-IA-6467F2" alt="OpenRouter">
  <img src="https://img.shields.io/badge/Stripe-Checkout-635bff?logo=stripe&logoColor=white" alt="Stripe">
</p>

<p align="center">
  <img src="docs/images/01-couverture.jpg" alt="Kairn : retenir ce qu'on lit, sans écrire de fiches" width="100%">
</p>

<p align="center">
  <img src="docs/images/02-depot.jpg" alt="Essai sans compte : un texte découpé en concepts et questions" width="32%">
  <img src="docs/images/03-revision.jpg" alt="Session de révision" width="32%">
  <img src="docs/images/04-suivi.jpg" alt="Concepts du jour et dépôts" width="32%">
</p>

<p align="center">
  <sub>Essai sans compte · Révision espacée · Au quotidien</sub>
</p>

---

## Aperçu

Kairn prend un dépôt libre — une phrase, un pavé collé, une capture d'écran — et en tire des
concepts unitaires (`Atom`). Chaque concept porte jusqu'à quatre formulations de question (`Variant`),
une par facette : reconnaître, expliquer le mécanisme, délimiter, appliquer. La planification par
répétition espacée porte sur le concept, pas sur la formulation : les formulations tournent pour
éviter de mémoriser une tournure plutôt qu'une idée, et c'est la facette qui fait tourner, pas le
format.

Le découpage et la génération de questions passent par un modèle de langage, derrière un unique
point d'entrée `callAI()` qui porte les garde-fous de budget. En développement, un mode mock rend
des fixtures : toute l'interface et tout le pipeline se développent sans un seul appel réel.

**État.** Le produit tourne de bout en bout. L'ingestion prend un texte ou une capture, la lit, la
découpe en concepts et écrit leurs questions. Le moteur de révision sert la session du jour, fait
tourner les formulations, replanifie avec ts-fsrs et propose un entraînement libre qui ne touche à
rien de la mémoire. La progression compte l'effort et la consolidation, jamais la justesse. Les
garde-fous de budget sont posés et vérifiés à l'exécution : plafond global, part par compte, quotas
d'ingestion, limites de débit.

L'entrée est ouverte : on dépose depuis la page publique, sans compte, et le découpage s'affiche
avant qu'on demande quoi que ce soit (voir « Le dépôt avant compte »). La connexion se fait par code
à six chiffres envoyé à l'adresse, sans mot de passe nulle part. Un compte peut exporter ses données
et se supprimer lui-même.

## Stack

| Domaine            | Choix                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict                                             |
| Base de données    | PostgreSQL, Prisma 7 avec le driver adapter `@prisma/adapter-pg`                                            |
| Authentification   | better-auth : code à six chiffres par email, Google si configuré, aucun mot de passe                        |
| Répétition espacée | `ts-fsrs`                                                                                                   |
| Modèle             | OpenRouter en primaire (`AI_FOURNISSEUR`), pont SDK Anthropic, repli automatique sur Sonnet, validation Zod |
| Interface          | Tailwind v4, primitives shadcn/ui retokenisées, Motion                                                      |
| Email              | Resend                                                                                                      |
| Paiement           | Stripe : Checkout et portail hébergés, droits accordés par le webhook signé                                 |
| Mesure d'audience  | Vercel Web Analytics, sans cookie ni identifiant persistant                                                 |

## Prérequis

- Node.js 20.19+, 22.12+ ou 24+ — le plancher de Prisma 7
- Une base PostgreSQL 16+ accessible (le projet est développé sur Neon)
- Aucune clé de fournisseur de modèle n'est utile tant que `MOCK_AI=true` : tout le pipeline se
  développe sur fixtures. `MOCK_AI`, `AI_ENABLED` et les variables `AI_*` restent requises : la
  configuration est validée à chaque appel, mock compris
- Ni compte Resend ni identifiants OAuth Google ne sont nécessaires pour entrer dans un compte en
  local — voir la note sous l'installation

## Installation

```bash
git clone https://github.com/Namirop/kairn.git
cd kairn
npm install                 # `postinstall` génère le client Prisma
cp .env.example .env        # puis renseigner au minimum DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
npm run db:migrate          # applique les migrations
npm run db:seed             # remplit la base avec un compte de démonstration
npm run dev
```

L'adresse du compte de démonstration est définie dans `prisma/seed/account.ts` et surchargeable
par `SEED_USER_EMAIL`. Il n'a pas de mot de passe : on y entre en demandant un code depuis l'écran
de connexion, comme sur n'importe quel compte.

**Sans `RESEND_API_KEY` ou sans `EMAIL_FROM`, le code se lit dans les journaux du serveur.**
`sendEmail()` journalise l'objet du message et jamais son contenu, et l'objet du code de connexion
porte le code — c'est ce qui permet d'entrer en local sans compte fournisseur. Ce chemin lève en
production : une variable oubliée s'y voit comme une panne au lieu de fermer la porte en silence.

`BETTER_AUTH_URL` fixe aussi le port : better-auth n'admet que l'origine qu'elle nomme, et un
serveur de développement qui démarre sur un autre port voit ses connexions refusées en
`Invalid origin` dès que le navigateur porte un cookie du site.

## Variables d'environnement

| Nom                            | Requis | Description                                                                                                                |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | oui    | Connexion applicative, seed compris. Sur Neon, l'endpoint poolé.                                                           |
| `DIRECT_URL`                   | oui    | Connexion directe, sans pooler. Lue par `prisma.config.ts`, donc par la CLI Prisma : migrations, génération du client.     |
| `BETTER_AUTH_SECRET`           | oui    | Signature des sessions, et des jetons de désinscription.                                                                   |
| `BETTER_AUTH_URL`              | oui    | URL publique de l'application, sans slash final.                                                                           |
| `GOOGLE_CLIENT_ID`             | non    | Sans lui et son secret, le fournisseur Google n'est simplement pas proposé.                                                |
| `GOOGLE_CLIENT_SECRET`         | non    | Voir ci-dessus.                                                                                                            |
| `AI_FOURNISSEUR`               | non    | La route des appels : `openrouter` ou `anthropic`. Absente, c'est `anthropic`.                                             |
| `OPENROUTER_API_KEY`           | non    | Clé OpenRouter du produit, exigée avec `AI_FOURNISSEUR=openrouter`. Distincte de la clé du banc.                           |
| `ANTHROPIC_API_KEY`            | non    | Clé du pont Anthropic, lue seulement avec `AI_FOURNISSEUR=anthropic`.                                                      |
| `RESEND_API_KEY`               | non    | Sans elle, les emails sont journalisés en dev — et l'envoi lève en prod.                                                   |
| `EMAIL_FROM`                   | non    | Expéditeur des emails transactionnels. Même règle que `RESEND_API_KEY`.                                                    |
| `EMAIL_ALERTES`                | non    | Destinataire des alertes d'exploitation : plafonds, bascules, retours, webhook de paiement. Absente, elles ne partent pas. |
| `CRON_SECRET`                  | non    | Jeton `Authorization: Bearer` des routes cron. Absent, elles refusent tout.                                                |
| `BATTEMENT_JOBS_URL`           | non    | Heartbeat Better Stack signalé par `/api/cron/jobs` quand il aboutit.                                                      |
| `BATTEMENT_RAPPELS_URL`        | non    | Idem pour `/api/cron/rappels`.                                                                                             |
| `MOCK_AI`                      | oui    | `true` sert des fixtures locales, sans aucune requête réseau.                                                              |
| `AI_ENABLED`                   | oui    | `false` fait échouer immédiatement tout appel modèle.                                                                      |
| `AI_DAILY_CALL_CAP`            | oui    | Plafond global d'appels réels par jour, vérifié avant émission.                                                            |
| `AI_DAILY_CALL_CAP_PAR_COMPTE` | oui    | Part d'un seul compte dans ce plafond, réservée avant lui.                                                                 |
| `AI_DAILY_CALL_CAP_ANONYME`    | oui    | Part du trafic sans compte dans ce plafond, tous visiteurs confondus.                                                      |
| `AI_MODEL`                     | oui    | Identifiant du modèle primaire, dans la forme qu'attend la route choisie. Le modèle de repli est fixé dans le code.        |
| `ADMIN_EMAILS`                 | non    | Adresses autorisées à ouvrir `/admin`. Vide n'autorise personne.                                                           |
| `AI_MAX_TOKENS`                | oui    | `max_tokens` par défaut, toujours envoyé ; une sortie coupée est un échec.                                                 |
| `STRIPE_SECRET_KEY`            | non    | Clé Stripe. Sans elle et le secret du webhook, le paiement est fermé et l'écran le dit.                                    |
| `STRIPE_WEBHOOK_SECRET`        | non    | Secret de signature de l'endpoint webhook.                                                                                 |
| `PAIEMENT_LIVE`                | non    | Une clé `sk_live_` est refusée tant qu'elle ne vaut pas `true`.                                                            |
| `ESSAI_ANONYME_SANS_LIMITE`    | non    | `true` lève les verrous de l'essai sans compte, le temps d'une vérification.                                               |
| `SEED_USER_*`                  | non    | Adresse et fuseau du compte de démonstration.                                                                              |

Les valeurs réelles vivent dans `.env`, qui n'est pas versionné. `.env.example` sert de référence ;
il décrit aussi les variables du seul banc d'évaluation (`OPENROUTERAI_KEY`, `VOYAGE_IA_KEY`,
`BANC_DAILY_CALL_CAP`), que le produit ne lit jamais.

Ce que chacune vaut en production — et pourquoi certaines se régénèrent au lieu de se recopier —
est dans `docs/environnements.md`.

Le paiement a ses propres variables et sa propre logique : `docs/paiement.md` dit ce que Stripe
fait, ce qu'on ne lui laisse pas faire, pourquoi le webhook est le seul chemin qui accorde un
droit, et où en est le dossier TVA.

## Scripts

| Commande                         | Effet                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                    | Serveur de développement                                                                                         |
| `npm run build`                  | `prisma migrate deploy`, puis le build de production : lancé en local, il migre la base que désigne `DIRECT_URL` |
| `npm run typecheck`              | `tsc --noEmit`                                                                                                   |
| `npm run lint`                   | ESLint, frontières d'architecture comprises                                                                      |
| `npm test`                       | Vitest sur la logique pure, propriétés fast-check comprises                                                      |
| `npm run test:watch`             | Vitest en veille                                                                                                 |
| `npm run format`                 | Prettier en écriture                                                                                             |
| `npm run format:check`           | Prettier en vérification                                                                                         |
| `npm run db:migrate`             | `prisma migrate dev`                                                                                             |
| `npm run db:deploy`              | `prisma migrate deploy`, pour un environnement déployé                                                           |
| `npm run db:seed`                | Remplit la base ; rejouable sans dupliquer                                                                       |
| `npm run db:studio`              | Prisma Studio                                                                                                    |
| `npm run verifier:ai`            | Vérifie les garde-fous d'appel modèle à l'exécution                                                              |
| `npm run verifier:ingestion`     | Rejoue l'ingestion de bout en bout, en mode mock                                                                 |
| `npm run verifier:session`       | Rejoue le moteur de révision et l'entraînement libre                                                             |
| `npm run verifier:abus`          | Passe d'audit : quotas, débit, propriété, cycle de vie                                                           |
| `npm run verifier:contrastes`    | Mesure les ratios WCAG des couples posés par l'interface                                                         |
| `npm run verifier:abonnement`    | Prouve qu'un abonnement ne remonte pas le temps                                                                  |
| `npm run verifier:depot-anonyme` | Le chemin public du dépôt sans compte ; à sec sans `--emettre`                                                   |
| `npm run verifier:openrouter`    | Vérifie les modèles du banc au catalogue d'OpenRouter ; `--lister` rend le catalogue                             |
| `npm run eprouver:paiement`      | Le parcours d'achat contre le vrai Stripe, en mode test                                                          |
| `npm run regenerer:questions`    | Remet en file les questions d'un prompt qui a changé                                                             |
| `npm run reparer:affirmations`   | Retire les vrais ou faux sans verdict et redemande leur lot                                                      |
| `npm run depot:code`             | Ajoute le dépôt de code du seed à un compte existant                                                             |
| `npm run lire:cache`             | Lit le taux de cache et les bascules au registre `AiCall`                                                        |
| `npm run exporter:assets`        | Régénère les icônes et le symbole SVG depuis la géométrie du cairn                                               |
| `npm run exporter:marque`        | Exporte les variantes de la marque en images, dans `public/marque/`                                              |

Les commandes `evaluer:*` forment le banc d'évaluation, décrit plus bas. Avec
`verifier:depot-anonyme`, ce sont les seules qui appellent le modèle pour de vrai, et aucune ne le
fait sans `--emettre`.

Ce tableau dit ce que font les commandes. **Le principe qui les gouverne est dans
`docs/outillage.md`** : les trois registres à ne pas mélanger, la pyramide de vérification et ce
qui décide de l'étage, et pourquoi la commande d'un chantier clos sort du `package.json`.

## Architecture

```
app/
  (marketing)/   Landing et son champ de dépôt, mentions légales,
                 confidentialité, désinscription
  (auth)/        Connexion, inscription
  (app)/         Application authentifiée
  api/           Route handlers, dont les deux routes cron, le webhook de
                 paiement, l'export de compte et le réglage de fuseau
components/
  ui/            Primitives shadcn retokenisées, sans logique métier
  cairn/         L'empilement de pierres
  pwa/           Invite d'installation
  <domaine>/     Composants de présentation
lib/
  domain/        Logique pure : géométrie du cairn, échéances, jours locaux,
                 période de quota, contrôles automatiques sur une génération
  db/            Seul endroit qui importe le client Prisma
  ai/            callAI(), ponts vers les fournisseurs, prompts système,
                 schémas Zod, fixtures
  depots/        Le geste de dépôt côté serveur
  images/        Lecture et réduction d'une capture avant envoi au modèle
  paiement/      Stripe : configuration, achat, portail, webhook
  auth/  email/  jobs/  cron/  site/  design/  retours/
prisma/
  schema/        Schéma multi-fichiers
  seed/          Corpus de démonstration
scripts/
  evaluation/    Corpus du banc, exécution, rapport
  verification/  Cas des vérifications à l'exécution
```

Le sens des dépendances est `app/` → `lib/db/` → `lib/domain/`, et il est vérifié par ESLint :
`no-restricted-imports` interdit le SDK Anthropic hors de `lib/ai/client.ts` et de son pont
`lib/ai/fournisseurs/anthropic.ts`, le client Prisma hors de `lib/db/`, Resend hors de
`lib/email/`, et tout accès à Next ou React depuis `lib/domain/`.

### Appels au modèle

`callAI()` est le seul chemin du produit vers le modèle. Dans l'ordre : interrupteur `AI_ENABLED`,
mode mock, réservation d'une place dans le plafond journalier, appel avec `max_tokens` explicite et
un schéma de sortie dérivé du Zod, validation stricte de la réponse, puis écriture d'une ligne au
registre `AiCall` — succès comme échec, avec tokens, coût et latence. Aucun retry.

L'émission passe par un pont (`lib/ai/fournisseurs/`), choisi par `AI_FOURNISSEUR`. `openrouter`
appelle l'API d'OpenRouter et y porte le schéma en `response_format` ; `anthropic`, le défaut quand
la variable est absente, passe par le SDK natif et le porte en `output_config.format`. Les modèles
`openai/…` refusent nos schémas en mode strict : le pont OpenRouter les leur envoie sans `strict`,
recopiés en tête du prompt système, et c'est la validation Zod qui tient la forme.

**Un repli, pas un retry.** Quand l'appel tombe — échec de la requête, sortie absente, invalide ou
tronquée —, le même pont réémet une fois sur Sonnet, dont l'identifiant est fixé dans
`lib/ai/client.ts` et non lu dans `AI_MODEL`. La ligne du repli porte `AiCall.basculee`, et au-delà
de cinq bascules dans la journée une alerte part à `EMAIL_ALERTES`. Aucun repli quand le modèle
primaire est déjà Sonnet, ni quand l'appelant impose son modèle. Le repli est une seconde émission
réelle : il prend sa propre place au plafond global, qui protège le budget, mais pas de part de
compte ni de trafic anonyme, qui comptent des demandes. Plafond atteint, pas de repli : l'échec du
primaire remonte.

La forme envoyée n'est pas produite par l'assistant du SDK, qui rétrograde `enum` et `const` en
simple description : `lib/ai/output-schema.ts` dérive le schéma JSON à la main pour les conserver,
et lève plutôt que d'émettre si la forme porte un mot-clé structurel (`$ref`, `oneOf`, `if`…) que
la grammaire ne compile pas. Une forme intraduisible est une erreur de développement, pas un appel
raté : elle est détectée avant que le registre s'ouvre.

La réservation passe par la table `AiCallQuota`, une ligne par jour UTC, et tient dans une seule
instruction qui incrémente et refuse dans le même mouvement. Compter les lignes d'`AiCall` avant
d'émettre serait une course : deux appels simultanés liraient la même valeur et passeraient tous
les deux. Une place prise n'est jamais rendue — un appel qui échoue a pu consommer des tokens.

Un appel prend **deux** places, dans cet ordre : d'abord la part de qui le demande, puis la place
globale. Si la globale est refusée, la part lui est rendue — contrairement à la globale, elle n'a
rien émis.

La part dépend de la provenance. Un appel qui porte un utilisateur prend dans `AiUserQuota`
(`AI_DAILY_CALL_CAP_PAR_COMPTE`) ; un essai sans compte prend dans `AiAnonymousQuota`
(`AI_DAILY_CALL_CAP_ANONYME`), un seul seau pour tous les visiteurs ; un appel interne — outil,
évaluation — ne passe que le plafond global, n'ayant personne derrière à protéger. Une reprise par
le cron garde la provenance de son dépôt : elle prend sur la part du compte, ou sur celle du public
pour un essai.

Le plafond global protège le budget ; il ne protégeait personne de son voisin, et un seul compte
pouvait fermer la journée de tous les autres. La part anonyme joue le même rôle entre le trafic
public et le trafic identifié, dans les deux sens.

Le refus global n'est pas un échec de job. `runJob` remet le travail en file sans lui compter de
tentative : la journée est pleine, le même appel réussira demain, et le dépôt continue d'annoncer
un travail en cours au lieu d'annoncer une panne.

**Dimensionner ces deux plafonds.** Les deux se comptent en appels par jour UTC, mais ce n'est pas
en appels qu'ils se règlent — c'est en dépense, et la dépense se mesure au registre `AiCall` plutôt
qu'elle ne s'estime : chaque ligne porte son coût, calculé au tarif catalogue du modèle appelé
(`lib/domain/tarifs.ts`).

Le plafond **par compte** ne borne pas la dépense d'un compte — c'est le quota mensuel de concepts
qui le fait. Il borne sa **vitesse** : la part journalière décide seulement si un compte peut
saturer son mois en une heure ou en trois jours.

Le plafond **global** est un coupe-circuit, pas un rationnement. Il ne devrait jamais être atteint
par un usage normal : quand il l'est, tout s'arrête pour tout le monde jusqu'au lendemain UTC — y
compris l'essai sans compte de la page publique, si bien que la seule page qui convertit cesse de
convertir sans que rien ne le signale. Le poser revient donc à choisir ce qu'on accepte de perdre sur
une journée qui tourne mal, puis à diviser par le coût moyen d'un appel relevé au registre.

`npm run verifier:ai` pose un piège sur `fetch` et vérifie ces garde-fous à l'exécution plutôt que sur
parole.

Le raisonnement étendu n'est pas demandé sur les trois appels — coupé explicitement par le pont
Anthropic, absent de la requête OpenRouter : rien dans ces intentions n'a montré qu'il servait, et
le rouvrir se décidera sur une mesure. Une réponse coupée par `max_tokens` est traitée comme un
échec, jamais comme un résultat partiel — une sortie tronquée peut rester syntaxiquement
valide, et c'est l'échec qui ne se voit pas.

### Génération et banc d'évaluation

Trois prompts système vivent dans `lib/ai/prompts/`, un par intention : découper un dépôt en
concepts, écrire quatre questions sur chacun de trois concepts, lire une capture d'écran. Aucun ne
demande de répondre en JSON — la forme est portée par le schéma dérivé du Zod, et les deux ne
peuvent pas diverger ; seul le pont OpenRouter ajoute cette consigne, schéma compris, pour les
modèles qui refusent le mode strict. La relecture ne fait pas échouer un appel payé sur une sortie
qui se contredit : un motif de rejet à côté de concepts extraits cède aux concepts, le premier de
deux lots au même rang l'emporte, et un lot qui porte une question inexploitable — QCM sans
options, texte à trou sans phrase, question vide — disparaît seul, son concept repartant en file.

Les quatre questions d'un concept arrivent sous quatre clés nommées plutôt que dans un tableau :
c'est la forme elle-même qui garantit une facette par question, sans avoir à la contrôler après
coup.

`lib/ai/fixtures/` sert de niveau de qualité, pas seulement de bouchon : les sorties y sont écrites
à la main, du dépôt d'une phrase à l'article collé, en passant par l'affirmation fausse — extraite
telle quelle et marquée douteuse — et la liste de courses, rejetée avec son motif. Le cas servi est
choisi par mot-clé, à défaut par longueur : deux exécutions sur le même dépôt rendent la même
chose.

`npm run evaluer:generation` fait passer un corpus de dépôts (`scripts/evaluation/corpus/`) au vrai
modèle et écrit un rapport lisible : par dépôt les concepts extraits, par concept ses quatre
questions et leur facette. Des contrôles automatiques signalent ce qui se vérifie sans jugement
humain — renvoi hors du concept, facettes répétées ou servies dans le désordre, options de QCM aux
longueurs déséquilibrées, réponse recopiée dans l'énoncé. Le coût du passage se lit au registre
`AiCall`. Le reste — est-ce que la question est bonne — se juge à l'œil.

Le passage exige `MOCK_AI=false` explicitement, annonce le nombre d'appels qu'il va émettre, et ne
part qu'à l'appel de `--emettre` :

```bash
MOCK_AI=false npm run evaluer:generation             # affiche le plan et s'arrête
MOCK_AI=false npm run evaluer:generation -- --emettre
```

Les autres commandes du banc — `evaluer:rejeu`, `evaluer:completer`, `evaluer:mesures`,
`evaluer:rejet` — n'appellent elles aussi le modèle qu'avec `--emettre`. Seule la passe de vecteurs
d'`evaluer:mesures` part avant, chez Voyage AI, hors de `callAI()`.

### Ingestion

Un dépôt part en une action : un champ, une capture facultative, un bouton. Le serveur valide,
prend une place au quota du jour, réduit l'image s'il y en a une, écrit l'`Input` et met le travail
en file — aucun appel modèle n'a lieu dans la requête. Une clé d'envoi tirée au montage du
formulaire rend le geste idempotent : deux clics n'écrivent qu'un dépôt, et la place prise à tort
est rendue.

La suite s'enchaîne par jobs : lecture de la capture s'il y en a une, puis découpage en concepts,
puis écriture des questions. Les octets de l'image ne survivent pas à sa lecture — dès que le texte
existe, ils sont effacés dans la même écriture. Le découpage est un appel normal, parce que c'est le
retour visible du dépôt ; les questions suivent dans le même mouvement, par groupes de trois
concepts, parce que l'entraînement libre les rend utiles à l'instant du dépôt.

Rien de ce qui a coûté un appel n'est jeté : un dépôt dont les questions échouent garde ses
concepts, et l'écran dit ce qui manque. Un concept marqué douteux par le modèle ne part pas en
génération — lui écrire des questions riverait une erreur que personne n'a vérifiée ; il attend
d'être confirmé, réécrit ou supprimé.

Trois limites bornent le geste. Deux se comptent **au mois**, sur une période ancrée au jour
d'inscription et lue dans le calendrier de l'utilisateur : environ cinquante concepts sur le plan
gratuit et cinq cents sur le plan payant, et en second rideau deux fois plus de dépôts que de
concepts. La troisième est le débit, trois dépôts par minute, et elle reste courte —
elle protège le serveur sur la minute, pas le budget sur le mois. Le plafond porte sur le concept
parce que c'est lui qui coûte, et parce que déposer une phrase ne doit pas coûter autant que coller
un article ; les places non consommées ne se reportent pas.

« Environ » n'est pas une approximation d'écriture : un dépôt est autorisé tant qu'il reste une
place et rend ensuite ce qu'il rend, donc le dernier de la période peut retenir huit concepts sur
une seule place. Passé le plafond, plus rien ne part. Un redécoupage prend une place comme un dépôt,
et entre dans la fenêtre de débit au même titre.

Une place prise sur un dépôt qui s'arrête en **panne** — timeout, sortie illisible, plafond global —
est rendue. Une place prise sur un dépôt **rejeté** ne l'est pas : la chaîne a tourné, l'appel est dû,
et seuls les concepts, qui n'existent pas, ne sont pas comptés. Le plafond de concepts atteint sur
le plan gratuit propose le plan payant quand le paiement est ouvert ; sinon, et contre le rideau des
dépôts, il propose une liste d'attente plutôt qu'un mur.

Réviser et s'entraîner ne coûtent aucun appel modèle, mais écrivent et lisent : les trois gestes
correspondants passent par une fenêtre de cent vingt par minute et par compte, sur le même mécanisme.

### Le dépôt avant compte

La page publique porte le champ de dépôt. On dépose, l'extraction tourne, les concepts s'affichent —
et c'est seulement ensuite qu'on propose de créer un compte pour les retrouver. `Input` et `Atom`
sont rattachés à une `AnonymousSession` que désigne un cookie de visite, et l'inscription les
transfère au compte dans une transaction, depuis le hook `user.create.after` de better-auth : c'est
le seul instant où l'on tient à la fois le compte neuf et le cookie.

**La chaîne s'arrête à un seul concept questionné.** L'extraction rend tous les concepts, et le
premier d'entre eux qui soit questionnable reçoit ses quatre questions — c'est l'échantillon que la
landing montre, et le seul appel de génération qu'un visiteur déclenche. Les autres lots ne sont
demandés qu'une fois le compte créé, et c'est pour ça que la reprise rend les identifiants des
concepts à l'appelant plutôt que de générer elle-même : la dépense reprend là où quelqu'un s'engage.

C'est le seul endroit du produit qui dépense sans compte identifié, donc le plus serré :

| Verrou                  | Valeur                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| Par visite (cookie)     | deux essais par vingt-quatre heures glissantes, plus deux pannes |
| Par empreinte d'adresse | deux visites sur vingt-quatre heures glissantes                  |
| Conservation            | sept jours, puis le cron efface ce que personne n'a réclamé      |

Les deux essais sont dus quel qu'ait été leur résultat. Un essai qui ne rend rien — une liste de
courses, un lien nu — laisserait sinon quelqu'un devant une page morte ; et un essai qui réussit
n'a pas de raison de fermer la porte pour la semaine, alors que le geste le plus courant après un
premier jet est d'en déposer un vrai.

La fenêtre est glissante, donc la visite se rouvre d'elle-même le lendemain — **sur le même
cookie**. Ouvrir une visite neuve au retour aurait laissé la précédente derrière elle : la reprise
au compte se fait par l'identifiant du cookie, et ce qu'il ne désigne plus n'est réclamé par
personne.

Deux visites par adresse et non une, parce qu'une adresse ne désigne pas une personne : un bureau,
une école ou un opérateur mobile derrière son CGNAT sortent par une seule IPv4, et le premier arrivé
grillerait l'essai de tous les autres. Serrer davantage ne protégerait de personne — basculer en 4G
change d'adresse en cinq secondes. Ce verrou freine le passant qui recommence ; c'est
`AI_DAILY_CALL_CAP` qui borne la dépense.

Aucune adresse IP n'est conservée : `AnonymousSession.ipHash` porte un SHA-256 salé par
`BETTER_AUTH_SECRET`, tronqué. La question à laquelle il répond est « combien de visites viennent
d'ici », et une empreinte y répond sans garder de donnée qui désigne quelqu'un. Le refus par
empreinte se lit puis s'écrit, donc deux visiteurs simultanés depuis la même adresse peuvent passer
à quatre : la course est assumée, sa conséquence est une extraction de plus.

### Compte et données

Depuis les réglages, un compte exporte ce qu'il a déposé et sa progression en JSON
(`GET /api/mon-compte/export`), et se supprime lui-même — le compte, ses dépôts, ses concepts, leurs
formulations et leurs révisions partent avec, par les cascades du schéma. Les emails transactionnels
portent un lien de désinscription signé, qui mène à une page publique sans demander de connexion :
quelqu'un qui veut sortir n'a pas à rentrer d'abord.

### Travaux asynchrones

Une ingestion écrit un `GenerationJob` et rend la main ; `after()` déclenche le traitement une fois
la réponse envoyée. La route `GET /api/cron/jobs` reprend les travaux restés en attente et ceux dont
le processus est mort en cours de route depuis plus de dix minutes, au plus trois fois. La route
`GET /api/cron/rappels`, horaire, envoie le rappel quotidien aux comptes dont l'heure locale
correspond à leur heure de rappel et qui ont au moins un concept dû, puis l'alerte de série à 21 h
locales quand une série est en train d'être perdue ; chaque envoi passe une seule fois par compte,
par type et par jour local (`EmailDelivery`). Les deux exigent `Authorization: Bearer $CRON_SECRET`.

Quelle que soit l'étape qui échoue, un dépôt cesse d'annoncer un travail en cours : c'est la même
fonction qui referme, et elle garde les concepts déjà écrits.

## Vérification

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run verifier:ai && npm run verifier:ingestion
```

Les tests couvrent `lib/domain/` — logique pure, donc testable sans base ni réseau — et, aux mêmes
conditions, les schémas et l'alerte de plafond de `lib/ai/`, l'alerte de paiement et la géométrie
du banc (`vitest.config.mts`). Les règles vraies pour toutes les entrées y sont écrites en propriétés
fast-check : sur des instants et des fuseaux tirés au hasard parmi ceux que la plateforme connaît,
le jour civil fait foi, `localDay` conserve l'ordre du temps, `joursAvant` est antisymétrique ; les
contrôles de génération ne réagissent ni aux accents ni à la ponctuation.

Le banc d'évaluation ne fait pas partie de cette commande : il dépense.

`verifier:ai` vérifie à l'exécution ce qu'un test unitaire ne peut pas prouver : qu'aucune requête ne
sort en mode mock, que le plafond du jour refuse avant d'émettre, et qu'il tient quand vingt-cinq
réservations partent au même instant — cette garantie-là est dans
l'atomicité d'une instruction Postgres, pas dans le code TypeScript.

`verifier:ingestion` rejoue le pipeline entier sur un compte de vérification créé puis effacé : dépôt
texte et dépôt image jusqu'aux questions écrites, capture illisible, dépôt sans rien à retenir,
concept douteux puis confirmé, concept réécrit, dépôt de fiction, découpage ou lecture impossible,
échec à mi-parcours, double envoi, débit, quota, rideau des dépôts, liste d'attente. Il couvre aussi
le dépôt sans compte : la visite consommée, le second essai ouvert par un premier resté vide, la
limite par empreinte d'adresse, la reprise au compte et l'oubli de ce que personne n'a réclamé. Le même piège sur `fetch` y est armé : la vérification échoue si une
requête part vers un fournisseur de modèle.

`verifier:session` rejoue le moteur de révision et l'entraînement libre, la progression comptée, la
série autour de minuit local, la trace qu'un signalement laisse quand le concept est supprimé, la
fermeture de l'écran d'administration, et la suppression de compte — qui doit ne laisser aucune
ligne derrière elle, dans aucune table.

`verifier:abus` est la passe d'audit : cycle de vie des concepts, vecteurs de régénération comptés en
appels réellement émis, atomicité des compteurs sous concurrence, remboursement d'une panne,
propriété des ressources entre deux comptes, part de compte face au plafond global, et place prise
par un repli. Chaque
constat y est écrit comme la règle qu'on veut voir tenir, si bien qu'une ligne en échec est un trou
et non une panne de la vérification. Les cas qui comptent des appels coupent le mode mock — qui ne
réserve ni n'enregistre rien, donc ne peut rien compter — et émettent sans clé vers un port fermé :
ce qui se compte est ce que le produit aurait facturé, sans qu'une requête sorte.

Les pièges reconnaissent les hôtes des deux ponts, listés dans
`scripts/verification/hotes-des-fournisseurs.ts` : un pont ajouté doit y être déclaré. Le mode
compteur impose le pont Anthropic, le seul dont la base se redirige, retire les deux clés, et pose le
modèle primaire sur le modèle de repli : chaque émission y échoue, et un repli ouvert doublerait les
comptages. Le repli a son propre cas, qui le rouvre.

`verifier:contrastes` lit les jetons de couleur dans `app/globals.css` et calcule les ratios WCAG des
couples que l'interface pose réellement, surface sombre comprise. « Ça se lit » n'est pas une
vérification : deux gris passables sur un écran calibré deviennent illisibles au soleil, et le nom
d'une surface suffit à s'y tromper — celle qui s'appelle « ombre » est claire, seule « roche » est
sombre.

## Licence

Repo public à des fins de portfolio dev — utilisation, reproduction ou réutilisation du code
soumises à autorisation préalable.
