# Kairn

> Application de répétition espacée : on y dépose une information brute, elle est découpée en
> concepts, transformée en questions, et reposée au moment où elle est sur le point d'être oubliée.

## Aperçu

Kairn prend un dépôt libre — une phrase, un pavé collé, une capture d'écran — et en tire des
concepts unitaires (`Atom`). Chaque concept porte quatre formulations de question (`Variant`), une
par facette : reconnaître, expliquer le mécanisme, délimiter, appliquer. La planification par
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
avant qu'on demande quoi que ce soit (voir « Le dépôt avant compte »). La connexion se fait par lien
envoyé à l'adresse, sans mot de passe nulle part. Un compte peut exporter ses données et se
supprimer lui-même.

Ce qui manque, et qui se voit :

- **Le rappel quotidien n'envoie rien.** `GET /api/cron/rappels` sélectionne les comptes à l'heure,
  écarte ceux déjà notifiés, journalise — et rend `envoyes: 0`. L'envoi reste à brancher sur
  `sendNotification()`.
- **Les réglages sont en lecture seule.** L'écran affiche fuseau, heure de rappel et état des
  emails ; il ne les modifie pas. Le fuseau se réconcilie tout seul au premier affichage, et la
  désinscription passe par le lien des emails.

## Stack

| Domaine            | Choix                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict       |
| Base de données    | PostgreSQL, Prisma 7 avec le driver adapter `@prisma/adapter-pg`      |
| Authentification   | better-auth : lien par email, Google si configuré, aucun mot de passe |
| Répétition espacée | `ts-fsrs`                                                             |
| Modèle             | SDK Anthropic, sorties structurées contraintes, validation Zod        |
| Interface          | Tailwind v4, primitives shadcn/ui retokenisées, Motion                |
| Email              | Resend                                                                |

## Prérequis

- Node.js 20 ou plus récent
- Une base PostgreSQL 16+ accessible (le projet est développé sur Neon)
- Une clé API Anthropic est inutile tant que `MOCK_AI=true` : tout le pipeline se développe sur
  fixtures
- Un compte Resend **ou** des identifiants OAuth Google, en revanche, sont nécessaires pour entrer
  dans un compte — voir la note sous l'installation

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
par `SEED_USER_EMAIL`. Il n'a pas de mot de passe : on y entre en demandant un lien depuis l'écran
de connexion, comme sur n'importe quel compte.

**Se connecter en local demande donc un fournisseur d'email.** Sans `RESEND_API_KEY`, `sendEmail()`
journalise l'objet du message et jamais son contenu — le lien n'apparaît nulle part, et il n'y a pas
d'autre porte que Google. Renseigne l'une des deux avant de vouloir entrer dans un compte.

## Variables d'environnement

| Nom                            | Requis | Description                                                                 |
| ------------------------------ | ------ | --------------------------------------------------------------------------- |
| `DATABASE_URL`                 | oui    | Connexion applicative. Sur Neon, l'endpoint poolé.                          |
| `DIRECT_URL`                   | oui    | Connexion directe, sans pooler. Utilisée par Migrate et par le seed.        |
| `BETTER_AUTH_SECRET`           | oui    | Signature des sessions, et des jetons de désinscription.                    |
| `BETTER_AUTH_URL`              | oui    | URL publique de l'application, sans slash final.                            |
| `GOOGLE_CLIENT_ID`             | non    | Sans lui et son secret, le fournisseur Google n'est simplement pas proposé. |
| `GOOGLE_CLIENT_SECRET`         | non    | Voir ci-dessus.                                                             |
| `ANTHROPIC_API_KEY`            | non    | Inutile tant que `MOCK_AI=true`.                                            |
| `RESEND_API_KEY`               | non    | Sans elle, les emails sont journalisés en dev — et l'envoi lève en prod.    |
| `EMAIL_FROM`                   | non    | Expéditeur des emails transactionnels.                                      |
| `CRON_SECRET`                  | oui    | Jeton `Authorization: Bearer` des routes cron.                              |
| `MOCK_AI`                      | oui    | `true` sert des fixtures locales, sans aucune requête réseau.               |
| `AI_ENABLED`                   | oui    | `false` fait échouer immédiatement tout appel modèle.                       |
| `AI_DAILY_CALL_CAP`            | oui    | Plafond global d'appels réels par jour, vérifié avant émission.             |
| `AI_DAILY_CALL_CAP_PAR_COMPTE` | oui    | Part d'un seul compte dans ce plafond, réservée avant lui.                  |
| `AI_DAILY_CALL_CAP_ANONYME`    | oui    | Part du trafic sans compte dans ce plafond, tous visiteurs confondus.       |
| `AI_MODEL`                     | oui    | Identifiant du modèle.                                                      |
| `ADMIN_EMAILS`                 | non    | Adresses autorisées à ouvrir `/admin`. Vide n'autorise personne.            |
| `AI_MAX_TOKENS`                | oui    | `max_tokens` par défaut, toujours envoyé ; une sortie coupée est un échec.  |
| `SEED_USER_*`                  | non    | Adresse et fuseau du compte de démonstration.                               |

Les valeurs réelles vivent dans `.env`, qui n'est pas versionné. `.env.example` sert de référence.

Ce que chacune vaut en production — et pourquoi certaines se régénèrent au lieu de se recopier —
est dans `docs/environnements.md`.

## Scripts

| Commande                    | Effet                                                     |
| --------------------------- | --------------------------------------------------------- |
| `npm run dev`               | Serveur de développement                                  |
| `npm run build`             | Build de production                                       |
| `npm run typecheck`         | `tsc --noEmit`                                            |
| `npm run lint`              | ESLint, frontières d'architecture comprises               |
| `npm test`                  | Vitest sur `lib/domain/`, propriétés fast-check comprises |
| `npm run test:watch`        | Vitest en veille                                          |
| `npm run format`            | Prettier en écriture                                      |
| `npm run db:migrate`        | `prisma migrate dev`                                      |
| `npm run db:deploy`         | `prisma migrate deploy`, pour un environnement déployé    |
| `npm run db:seed`           | Remplit la base ; rejouable sans dupliquer                |
| `npm run db:studio`         | Prisma Studio                                             |
| `npm run verify:ai`         | Vérifie les garde-fous d'appel modèle à l'exécution       |
| `npm run verify:ingestion`  | Rejoue l'ingestion de bout en bout, en mode mock          |
| `npm run verify:session`    | Rejoue le moteur de révision et l'entraînement libre      |
| `npm run verify:abus`       | Passe d'audit : quotas, débit, propriété, cycle de vie    |
| `npm run verify:contrastes` | Mesure les ratios WCAG des couples posés par l'interface  |

`npm run eval:generation` existe aussi : c'est le banc d'évaluation, décrit plus bas. C'est le seul
script du dépôt qui émet de vrais appels, et il ne part pas sans qu'on le lui dise deux fois.

## Architecture

```
app/
  (marketing)/   Landing et son champ de dépôt, mentions légales,
                 confidentialité, désinscription
  (auth)/        Connexion, inscription
  (app)/         Application authentifiée
  api/           Route handlers, dont les trois routes cron, l'export de
                 compte et le réglage de fuseau
components/
  ui/            Primitives shadcn retokenisées, sans logique métier
  cairn/         L'empilement de pierres
  pwa/           Invite d'installation
  <domaine>/     Composants de présentation
lib/
  domain/        Logique pure : géométrie du cairn, échéances, jours locaux,
                 période de quota, contrôles automatiques sur une génération
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

Un appel prend **deux** places, dans cet ordre : d'abord la part de qui le demande, puis la place
globale. Si la globale est refusée, la part lui est rendue — contrairement à la globale, elle n'a
rien émis.

La part dépend de la provenance. Un appel qui porte un utilisateur prend dans `AiUserQuota`
(`AI_DAILY_CALL_CAP_PAR_COMPTE`) ; un essai sans compte prend dans `AiAnonymousQuota`
(`AI_DAILY_CALL_CAP_ANONYME`), un seul seau pour tous les visiteurs ; un appel interne — reprise
par le cron, outil, évaluation — ne passe que le plafond global, n'ayant personne derrière à
protéger.

Le plafond global protège le budget ; il ne protégeait personne de son voisin, et un seul compte
pouvait fermer la journée de tous les autres. La part anonyme joue le même rôle entre le trafic
public et le trafic identifié, dans les deux sens.

Le refus global n'est pas un échec de job. `runJob` remet le travail en file sans lui compter de
tentative : la journée est pleine, le même appel réussira demain, et le dépôt continue d'annoncer
un travail en cours au lieu d'annoncer une panne.

**Dimensionner ces deux plafonds.** Les deux se comptent en appels par jour UTC, mais ce n'est pas
en appels qu'ils se règlent — c'est en dépense, et la dépense se mesure au registre `AiCall` plutôt
qu'elle ne s'estime. Sur les appels enregistrés : une extraction coûte environ 0,011 $, une écriture
de questions groupée environ 0,014 $, une lecture de capture environ 0,015 $. Un appel du chemin de
production revient donc autour de **0,013 $**.

Le plafond **par compte** ne borne pas la dépense d'un compte — c'est le quota mensuel de concepts
qui le fait. Il borne sa **vitesse** : un compte qui sature son mois consomme une vingtaine d'appels
en tout, soit un quart de dollar, et la part journalière décide seulement s'il peut le faire en une
heure ou en trois jours.

Le plafond **global** est un coupe-circuit, pas un rationnement. Il ne devrait jamais être atteint
par un usage normal : quand il l'est, tout s'arrête pour tout le monde jusqu'au lendemain UTC — y
compris l'essai sans compte de la page publique, si bien que la seule page qui convertit cesse de
convertir sans que rien ne le signale. Le poser revient donc à choisir ce qu'on accepte de perdre sur
une journée qui tourne mal, puis à diviser par le coût d'un appel : cinq dollars par jour font environ
quatre cents appels.

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

Trois limites bornent le geste. Deux se comptent **au mois**, sur une période ancrée au jour
d'inscription et lue dans le calendrier de l'utilisateur : environ trente concepts, et soixante
dépôts en second rideau. La troisième est le débit, trois dépôts par minute, et elle reste courte —
elle protège le serveur sur la minute, pas le budget sur le mois. Le plafond porte sur le concept
parce que c'est lui qui coûte, et parce que déposer une phrase ne doit pas coûter autant que coller
un article ; les places non consommées ne se reportent pas.

« Environ » n'est pas une approximation d'écriture : un dépôt est autorisé tant qu'il reste une
place et rend ensuite ce qu'il rend, donc le dernier de la période peut retenir huit concepts sur
une seule place. Passé le plafond, plus rien ne part. Un redécoupage prend une place comme un dépôt,
et entre dans la fenêtre de débit au même titre.

Une place prise sur un dépôt qui s'arrête en **panne** — timeout, sortie illisible, plafond global —
est rendue. Une place prise sur un dépôt **rejeté** ne l'est pas : la chaîne a tourné, l'appel est dû,
et seuls les concepts, qui n'existent pas, ne sont pas comptés. Le plafond atteint propose une liste
d'attente plutôt qu'un mur.

Réviser et s'entraîner ne coûtent aucun appel modèle, mais écrivent et lisent : les trois gestes
correspondants passent par une fenêtre de cent vingt par minute et par compte, sur le même mécanisme.

### Le dépôt avant compte

La page publique porte le champ de dépôt. On dépose, l'extraction tourne, les concepts s'affichent —
et c'est seulement ensuite qu'on propose de créer un compte pour les retrouver. `Input` et `Atom`
sont rattachés à une `AnonymousSession` que désigne un cookie de visite, et l'inscription les
transfère au compte dans une transaction, depuis le hook `user.create.after` de better-auth : c'est
le seul instant où l'on tient à la fois le compte neuf et le cookie.

**La chaîne s'arrête à l'extraction.** Les questions, qui coûtent l'essentiel, ne sont demandées
qu'une fois le compte créé — un visiteur qui repart coûte un appel de découpage. C'est ce qui rend
l'ouverture tenable, et c'est pour ça que la reprise rend les identifiants des concepts à l'appelant
plutôt que de générer elle-même : la dépense reprend là où quelqu'un s'engage.

C'est le seul endroit du produit qui dépense sans compte identifié, donc le plus serré :

| Verrou                  | Valeur                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| Par visite (cookie)     | deux essais, mais un essai **qui rend des concepts** ferme la visite |
| Par empreinte d'adresse | deux visites sur vingt-quatre heures glissantes                      |
| Conservation            | sept jours, puis le cron efface ce que personne n'a réclamé          |

Le second essai existe pour le cas où le premier ne rend rien — une liste de courses, un lien nu —
qui laisserait sinon quelqu'un devant une page morte sans avoir rien vu du produit.

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
quota, liste d'attente. Il couvre aussi le dépôt sans compte : la visite consommée, le second essai
ouvert par un premier resté vide, la limite par empreinte d'adresse, la reprise au compte et l'oubli
de ce que personne n'a réclamé. Le même piège sur `fetch` y est armé : la vérification échoue si une
requête part vers l'API.

`verify:session` rejoue le moteur de révision et l'entraînement libre, la progression comptée, la
série autour de minuit local, la trace qu'un signalement laisse quand le concept est supprimé, la
fermeture de l'écran d'administration, et la suppression de compte — qui doit ne laisser aucune
ligne derrière elle, dans aucune table.

`verify:abus` est la passe d'audit : cycle de vie des concepts, vecteurs de régénération comptés en
appels réellement émis, atomicité des compteurs sous concurrence, remboursement d'une panne,
propriété des ressources entre deux comptes, et part de compte face au plafond global. Chaque
constat y est écrit comme la règle qu'on veut voir tenir, si bien qu'une ligne en échec est un trou
et non une panne de la vérification. Les cas qui comptent des appels coupent le mode mock — qui ne
réserve ni n'enregistre rien, donc ne peut rien compter — et émettent sans clé vers un port fermé :
ce qui se compte est ce que le produit aurait facturé, sans qu'une requête sorte.

`verify:contrastes` lit les jetons de couleur dans `app/globals.css` et calcule les ratios WCAG des
couples que l'interface pose réellement, surface sombre comprise. « Ça se lit » n'est pas une
vérification : deux gris passables sur un écran calibré deviennent illisibles au soleil, et le nom
d'une surface suffit à s'y tromper — celle qui s'appelle « ombre » est claire, seule « roche » est
sombre.

## Licence

Repo public à des fins de portfolio dev — utilisation, reproduction ou réutilisation du code
soumises à autorisation préalable.
