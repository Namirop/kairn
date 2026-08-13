# Développement et production

Le même code tourne à deux endroits. Ce qui change, ce n'est jamais le code —
c'est ce qu'il y a autour : quelle base il ouvre, à quelle adresse il se croit,
quelles clés il présente, et s'il a le droit de dépenser.

C'est tout ce qu'est un « environnement » : un jeu de variables qui décrit ce
qu'il y a autour du code. Sur une machine, elles vivent dans un fichier `.env`
que git ignore. Chez l'hébergeur, elles se posent dans une interface.

|                  | Développement           | Production                           |
| ---------------- | ----------------------- | ------------------------------------ |
| Où ça tourne     | Ta machine              | L'hébergeur                          |
| Adresse          | `http://localhost:3000` | Le domaine public                    |
| Base             | Un projet Neon à part   | Un autre projet Neon, vide au départ |
| Qui l'utilise    | Toi                     | Des inconnus                         |
| Ce qu'on y casse | Rien                    | Les données de vraies personnes      |

La dernière ligne est la seule qui compte vraiment. Elle explique toutes les
règles qui suivent.

## Quatre natures de variable

Se demander « est-ce que je recopie cette valeur ? » n'a pas de réponse générale.
Ça dépend de ce que la variable _est_. Il y en a quatre sortes, et chacune a sa
règle.

### 1. Les adresses — elles désignent quelque chose qui diffère

`DATABASE_URL` dit où est la base. En développement elle pointe une base de jeu ;
en production, la vraie. Ce sont deux endroits distincts, donc deux valeurs
distinctes. Pas par prudence : par définition.

Recopier l'adresse de développement en production ferait tourner le site public
sur ta base de test. Recopier celle de production en développement est pire :
tes essais écriraient dans les données de vrais gens, et un `prisma migrate
reset` malheureux les effacerait.

**Toujours différentes.** C'est le cas le plus simple.

### 2. Les secrets — les partager annule ce qu'ils protègent

Un secret n'a de valeur que parce qu'un seul endroit le connaît. Deux
environnements qui partagent le même secret n'en ont plus qu'un seul, et c'est le
plus faible des deux qui décide de la sécurité de l'autre.

Prends la clé qui signe les sessions (`BETTER_AUTH_SECRET` ici, `SECRET_KEY` dans
un projet Django, `NEXTAUTH_SECRET` ailleurs — c'est le même objet). Elle sert à
signer le cookie qui prouve « cette personne est connectée ». Si la même clé
signe en développement et en production, un cookie fabriqué sur ta machine est
valide sur le site public. Ta base de développement, où tu crées des comptes à la
volée sans y penser, devient une machine à forger des sessions de production.

**Toujours neufs en production.** Et si un secret de production fuite un jour, on
le régénère — ce qui déconnecte tout le monde, d'où l'intérêt de le poser une
bonne fois avant l'ouverture plutôt qu'après.

Même raisonnement pour les clés d'API de services tiers, avec une raison de plus :
des clés distinctes te laissent lire la dépense de production séparément de tes
essais, et en révoquer une sans casser l'autre.

#### Fabriquer un secret

`BETTER_AUTH_SECRET` et `CRON_SECRET` ne viennent d'aucun service : ce sont
simplement des chaînes que personne ne peut deviner. Elles se génèrent en local,
une valeur différente par secret et par environnement :

```bash
openssl rand -base64 32
```

Sans `openssl` — sous PowerShell, par exemple — Node fait le même travail :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Jamais depuis un générateur en ligne.** Un site qui fabrique ton secret l'a vu,
et rien ne prouve qu'il ne l'a pas gardé : un secret qui a transité par un
serveur tiers n'en est plus un. La même règle vaut pour le transport — un secret
collé dans une conversation, un ticket ou un canal d'équipe doit être considéré
comme public, et régénéré.

#### Révoquer

Chez la plupart des fournisseurs, **supprimer une clé est la révocation** : il n'y
a pas d'action distincte, et la supprimer l'invalide immédiatement. Une clé n'est
pas une ressource, c'est un droit d'accès — on n'en perd rien en la supprimant, on
en crée une autre.

Les identifiants de base de données ne se suppriment pas, eux : ils se
**réinitialisent**. Chez Neon, on remet à zéro le mot de passe du rôle sur la
branche concernée, ce qui produit une nouvelle chaîne de connexion et tue
l'ancienne. Il faut alors reporter la nouvelle chaîne partout où elle servait,
sous peine de couper l'application.

### 3. Les interrupteurs — ils changent le comportement du code

Certaines variables ne désignent rien, elles décident. `NODE_ENV`, `DEBUG`,
`MOCK_AI`. Leur valeur n'est pas « un secret de dev » ou « un secret de prod » :
c'est un choix de comportement, et le bon choix diffère parce que le but diffère.

Le cas classique est le mode debug d'un framework. En développement, une erreur
affiche la pile d'appels, les requêtes SQL, parfois les variables
d'environnement — c'est exactement ce qu'il faut pour corriger. En production,
cette même page offre à un inconnu la carte de ton infrastructure. Ce n'est pas
un secret qu'on régénère, c'est un interrupteur qu'on bascule.

**Valeur choisie pour chaque environnement, indépendamment.** Souvent opposée,
mais pas par principe : parce que le but n'est pas le même.

### 4. Les réglages — un nombre ou un nom

`AI_MODEL`, `AI_MAX_TOKENS`, une durée de cache, une taille de page. Ils ne
désignent rien et ne protègent rien : ils règlent. La plupart se recopient à
l'identique, et ceux qui ne se recopient pas sont ceux dont la _bonne valeur_
dépend de la charge réelle — un plafond de dépense n'a pas le même sens quand un
seul développeur l'utilise et quand cent personnes le partagent.

**À l'identique, sauf quand la valeur dépend de l'usage.**

## Comment trancher pour une variable inconnue

Trois questions, dans l'ordre :

1. **Est-ce que ça désigne un endroit ?** → adresse, elle diffère.
2. **Est-ce que la connaître donne un pouvoir ?** → secret, neuf en production.
3. **Est-ce que le code se comporte différemment selon sa valeur ?** →
   interrupteur, choisis pour chaque environnement.

Si c'est non aux trois, c'est un réglage : recopie, et repose-toi la question le
jour où la charge change.

## Les variables propres à Kairn

Les trois qui suivent ne ressemblent à rien de ce qu'on trouve dans un projet web
ordinaire. Elles méritent leur explication.

### `MOCK_AI` — un interrupteur, et le plus coûteux à se tromper

À `true`, `callAI()` ne sort pas sur le réseau : il sert des fixtures écrites à la
main dans `lib/ai/fixtures/`. Toute l'interface, tout le pipeline d'ingestion et
tout le moteur de révision se développent ainsi, sans dépenser un centime et sans
dépendre d'une clé API.

À `false`, les appels partent vraiment.

**En production, `false` obligatoirement.** Laissée à `true`, l'application ne
plante pas — elle sert à tout le monde les mêmes concepts de démonstration,
quelle que soit la phrase déposée. Aucune erreur, aucun journal, juste un produit
qui ment. C'est le pire genre de panne, et c'est pour ça que cette variable mérite
d'être vérifiée deux fois.

En développement, la règle du projet est `true` par défaut. On la bascule
volontairement, le temps d'éprouver la vraie génération, puis on la remet.

**Les deux doivent être posées sur l'hébergeur.** `readAiConfig()` les valide par
un schéma Zod : absentes, la validation échoue et tout appel au modèle lève. Ce ne
sont pas des variables facultatives.

### `AI_ENABLED` — l'interrupteur d'arrêt

`MOCK_AI` détourne les appels vers des fixtures ; `AI_ENABLED` les **interdit**.
À `false`, `callAI()` lève immédiatement, avant toute autre vérification — pas de
fixture, pas de réseau, rien. Un dépôt en cours échoue proprement et le dépôt
cesse d'annoncer un travail en cours.

C'est la poignée qu'on tire quand quelque chose part de travers : une boucle qui
consomme le plafond en dix minutes, une facture qui grimpe sans qu'on comprenne
pourquoi, une fuite de clé. On coupe, on regarde, on rallume — sans déployer, sans
toucher au code.

La configuration est relue **à chaque appel** et non au chargement du module,
précisément pour ça : couper doit prendre effet tout de suite. Sur un hébergeur
qui injecte les variables au déploiement, il faut tout de même redéployer pour que
la nouvelle valeur atteigne le code — c'est le prix du serverless, et ça reste plus
rapide que de corriger un bug.

En production, `true` — sinon le produit ne fait rien. C'est un frein de secours,
pas un réglage.

### `AI_DAILY_CALL_CAP` et `AI_DAILY_CALL_CAP_PAR_COMPTE` — deux plafonds qui protègent deux choses

Ce sont deux compteurs d'**appels au modèle**, remis à zéro chaque jour **UTC**,
et ils ne défendent pas la même chose.

**`AI_DAILY_CALL_CAP` protège ton budget.** C'est le nombre maximal d'appels réels
que le produit entier peut émettre dans une journée, tous comptes confondus. Une
ligne par jour dans la table `AiCallQuota`, et la réservation tient dans une seule
instruction SQL qui incrémente et refuse dans le même mouvement — compter les
appels déjà passés avant d'émettre serait une course, et deux appels simultanés
liraient la même valeur et passeraient tous les deux.

**`AI_DAILY_CALL_CAP_PAR_COMPTE` protège les utilisateurs les uns des autres.** Le
plafond global, seul, ne protège personne de son voisin : un compte enthousiaste
— ou malveillant — pouvait vider la journée à lui seul et fermer le produit à
tous les autres jusqu'à minuit. Cette part-là borne ce qu'un compte peut prendre
dans le plafond global.

L'ordre dans lequel les deux places se prennent n'est pas indifférent. La part du
compte se prend **en premier**, parce qu'elle se rend : tant que rien n'est parti,
elle ne doit rien. La place globale se prend ensuite et **ne se rend jamais** — un
appel qui part et échoue a pu consommer des tokens. Si le global refuse, la part
du compte lui est rendue.

Un appel qui n'appartient à personne — une reprise par le cron, un outil interne —
ne passe que le plafond global. Il n'a pas de compte à qui prendre une part.

**Le rapport entre les deux est le vrai réglage.** À 150 et 40, quatre comptes
qui saturent leur part dépassent déjà le plafond global : le quatrième se fait
refuser par le global alors que sa part était libre. Ce n'est pas un bug, c'est le
budget qui parle — mais ça veut dire que le global doit rester nettement au-dessus
de la part multipliée par le nombre de comptes actifs attendus. C'est le genre de
nombre qu'on choisit pour la production plutôt que d'hériter de ses valeurs
d'essai.

**Oui, les deux doivent être posées sur l'hébergeur.** `readAiConfig()` les lit
dans `process.env` et les valide par un schéma Zod à **chaque appel**. Absentes ou
invalides, la validation échoue et _tout_ appel au modèle lève : plus d'ingestion,
plus de génération de questions. Ce ne sont pas des réglages facultatifs de
développement, ce sont des paramètres de fonctionnement.

Le fait qu'elles soient relues à chaque appel, et non une fois au démarrage, est
voulu : couper les appels doit prendre effet immédiatement. Sur un hébergeur qui
injecte les variables au déploiement, il faut tout de même redéployer pour qu'une
nouvelle valeur atteigne le code.

### `SEED_USER_EMAIL` — une variable qui n'existe pas en production

Elle désigne l'adresse du compte de démonstration que `prisma db seed` fabrique.
Le seed remplit une base de développement avec des dépôts, des concepts et des
révisions pour avoir quelque chose à regarder à l'écran.

**Une base de production ne se seed pas.** Elle démarre vide et se remplit de ce
que de vraies personnes y déposent. La variable n'a donc rien à faire sur
l'hébergeur — non pas parce qu'elle serait dangereuse, mais parce qu'elle n'y a
aucun sens.

C'est le quatrième cas, celui qu'on oublie : certaines variables ne se recopient
ni ne se régénèrent, elles **disparaissent**.

## Récapitulatif pour Kairn

| Variable                                            | Production                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`, `DIRECT_URL`                        | Adresses — celles du projet Neon de production                                                                                                   |
| `BETTER_AUTH_SECRET`                                | Secret — **neuf**                                                                                                                                |
| `CRON_SECRET`                                       | Secret — **neuf**                                                                                                                                |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`               | Secrets — clés distinctes de celles de développement                                                                                             |
| `BETTER_AUTH_URL`                                   | Adresse — le domaine public, sans slash final                                                                                                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`          | Réutilisables si l'URI de redirection de production est déclarée côté Google, et si l'écran de consentement est **publié** et non en « Testing » |
| `MOCK_AI`                                           | Interrupteur — **`false`**                                                                                                                       |
| `AI_ENABLED`                                        | Interrupteur — `true`                                                                                                                            |
| `AI_DAILY_CALL_CAP`, `AI_DAILY_CALL_CAP_PAR_COMPTE` | Réglages — à choisir pour la charge réelle, pas à hériter du développement                                                                       |
| `AI_MODEL`, `AI_MAX_TOKENS`                         | Réglages — identiques                                                                                                                            |
| `EMAIL_FROM`                                        | Réglage — sur le domaine vérifié chez le fournisseur d'emails                                                                                    |
| `ADMIN_EMAILS`                                      | Réglage — identique                                                                                                                              |
| `SEED_USER_EMAIL`, `SEED_USER_TIMEZONE`             | **Absentes**                                                                                                                                     |

## Comment le code arrive en production

Une variable décrit ce qu'il y a autour du code. Reste à savoir comment le code
lui-même passe d'une machine à l'autre — et la réponse tient dans une branche.

**`main` est la branche de production.** L'hébergeur la surveille : tout ce qui y
arrive part en ligne, sans confirmation. Une branche de travail, elle, ne
déclenche qu'un déploiement de prévisualisation — une URL à part, jetable, qui ne
touche pas au site public.

Ce découpage donne la règle : **on ne commite jamais sur `main`, on l'avance.**
Avancer `main` n'est pas un geste de version, c'est le geste de mise en ligne — le
seul moment où on décide que ce qui marchait chez soi devient ce que voient les
autres.

### Le cycle

```bash
# 1. Travailler sur la branche de travail, autant de commits qu'on veut
git add -A
git commit -m "…"
git push origin phase-5-production        # la production ne bouge pas

# 2. Vérifier : tests, build, et l'écran dans un navigateur

# 3. Mettre en ligne
git switch main
git merge --ff-only phase-5-production
git push origin main                      # le déploiement part
git switch phase-5-production             # et on retourne travailler
```

`--ff-only` est ce qui rend l'étape 3 sûre : la fusion **échoue** si `main` a
divergé au lieu de fabriquer un commit de fusion en silence. Un refus à cet
endroit veut dire que quelque chose est arrivé sur `main` qu'on n'a pas — et
c'est exactement le moment où l'on veut être arrêté.

### Les migrations passent avant le code

Un commit qui ajoute une migration Prisma ne l'applique pas. Si on pousse `main`
sans avoir migré, le code déployé interroge une colonne qui n'existe pas encore,
et l'erreur ne ressemble pas à un oubli de migration — elle ressemble à une panne.

L'ordre est donc toujours le même : **migrer la base de production, puis pousser
`main`**. Voir `DEPLOIEMENT.md` pour la commande.

### Revenir en arrière

Le retour arrière ne se joue pas dans git. L'hébergeur garde les déploiements
précédents et sait en repromouvoir un en production en quelques secondes — c'est
plus rapide et plus sûr qu'un commit de correction poussé dans l'urgence.

Git sert à réparer ensuite, une fois le site déjà revenu à un état qui marche.

La marche à suivre complète pour la mise en ligne est dans `DEPLOIEMENT.md`.
