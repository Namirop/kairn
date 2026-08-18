# Déploiement

Mise en ligne de Kairn sur Vercel, avec une base PostgreSQL Neon et Resend pour
les emails. Ce document donne les variables à renseigner, l'ordre des opérations,
et ce qu'il faut vérifier une fois en ligne.

Aucune valeur réelle ici : les variables sont décrites par leur **nom**. Les
secrets vivent dans l'interface de l'hébergeur, jamais dans le dépôt.

## Avant de commencer

Quatre choses ne s'obtiennent pas depuis le code et bloquent tout le reste :

1. **Un projet Neon distinct de celui de développement**, en région européenne.
   La page de confidentialité annonce un hébergement à Francfort ; la région d'un
   projet Neon se choisit à sa création et ne se change plus ensuite.
2. **Des identifiants OAuth Google de production.** Ceux de développement portent
   une URI de redirection en `localhost` et ne fonctionneront pas.
3. **Un domaine vérifié chez Resend.** Sans lui, aucun email ne part — donc
   personne ne peut se connecter, puisque le code de connexion est la seule
   porte d'entrée avec Google.
4. **Un plafond de dépense dans la Console Anthropic**, avec une alerte à un
   seuil bas. C'est le seul garde-fou de budget qui ne dépend pas du code.

## Les variables d'environnement

Toutes se posent dans le projet Vercel, sur l'environnement **Production**.

**Aucune ne se recopie du `.env` de développement sans y réfléchir.** Chacune
tombe dans l'un de quatre cas : une **adresse** qui désigne un endroit différent,
un **secret** qu'il faut régénérer, un **interrupteur** dont la bonne valeur
dépend du but, ou un **réglage** qui se recopie tel quel. Deux d'entre elles ne
se posent pas du tout. `docs/environnements.md` explique le classement, la règle
de chaque cas et le récapitulatif variable par variable ; les sections ci-dessous
donnent ce qu'il faut renseigner.

### Base de données

| Nom            | Ce que c'est                                                               |
| -------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL` | Connexion applicative. Sur Neon, l'endpoint **poolé** (hôte en `-pooler`). |
| `DIRECT_URL`   | Connexion **directe**, sans pooler. Migrations et seed uniquement.         |

Les deux pointent la même base et ne diffèrent que par l'hôte. L'application ne
lit que `DATABASE_URL` ; `DIRECT_URL` n'est lue que par `prisma.config.ts`, parce
que le pooler en mode transaction casse les verrous consultatifs de Migrate.

**Les deux se terminent par `?sslmode=verify-full&channel_binding=require`.** La
console Neon propose `sslmode=require`, que le pilote traite aujourd'hui comme
`verify-full` — en le disant à sa place, et en avertissant que la prochaine
version majeure de `pg` lui rendra le sens plus faible de libpq. Écrire
`verify-full` demande donc exactement ce qu'on obtient déjà, fait taire
l'avertissement, et empêche le jour où une mise à jour de dépendance
dégraderait la vérification du certificat sans que rien ne le signale.

### Authentification

| Nom                    | Ce que c'est                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Signature des sessions et des jetons de désinscription. **Secret neuf.** |
| `BETTER_AUTH_URL`      | URL publique du site, sans slash final.                                  |
| `GOOGLE_CLIENT_ID`     | Console Google Cloud. Sans lui et son secret, Google n'est pas proposé.  |
| `GOOGLE_CLIENT_SECRET` | Voir ci-dessus.                                                          |

L'URI de redirection à déclarer côté Google est `{BETTER_AUTH_URL}/api/auth/callback/google`.

**`BETTER_AUTH_URL` désigne un seul hôte, et le site ne doit répondre que sur
celui-là.** Vercel attache volontiers `kairn.me` et `www.kairn.me` au même
projet ; si les deux servent l'application, une connexion demandée depuis le
mauvais est refusée en 403 avec `[Better Auth]: Invalid origin`, avant même
qu'un email soit tenté. Le correctif est dans **Settings → Domains** : un
domaine principal, l'autre en **redirection** vers lui.

Le principal doit être **celui que nomme `BETTER_AUTH_URL`**, et c'est le seul
point qui décide du coût de l'opération. Dans ce sens-là, il n'y a rien d'autre
à faire. Dans l'autre, il faut aussi changer la variable, redéployer pour
qu'elle soit relue, et déclarer une nouvelle URI de redirection côté Google.

Attention en vérifiant : une redirection 308 est **permanente**, et le
navigateur la garde en cache. Après avoir inversé les deux réglages, il continue
d'envoyer sur l'ancien hôte et on croit que rien n'a changé. Tester en
navigation privée.

Ne pas régler ça en déclarant les deux origines comme fiables. Un cookie de
session appartient à l'hôte qui l'a posé : on serait connecté sur l'un et
déconnecté sur l'autre, sans que rien ne l'explique à l'écran.

L'origine du **déploiement courant** (`VERCEL_URL`) est admise, elle, et c'est
un cas différent : elle sert à pouvoir se connecter sur une preview pour
éprouver une branche avant de la fusionner. Une preview est un environnement
séparé — sa session n'a aucune raison d'être celle de la production, donc rien
ne se scinde.

`BETTER_AUTH_SECRET` ne doit **pas** être celui du développement : il signe les
cookies de session, et le partager entre deux environnements permet de forger une
session de production depuis une base de développement. Le changer déconnecte
tout le monde — d'où l'intérêt de le poser une bonne fois avant l'ouverture.

### Services externes

| Nom                 | Ce que c'est                                                 |
| ------------------- | ------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Clé de production, distincte de celle de développement.      |
| `RESEND_API_KEY`    | **Obligatoire en ligne** : sans elle, tout envoi lève.       |
| `EMAIL_FROM`        | Expéditeur, sur le domaine vérifié chez Resend. Obligatoire. |
| `CRON_SECRET`       | Jeton des routes cron. Voir la section « Les crons ».        |

### Garde-fous du modèle

| Nom                            | Valeur de production                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| `MOCK_AI`                      | `false` — sans quoi le produit sert des fixtures à tout le monde |
| `AI_ENABLED`                   | `true` — `false` coupe tout appel et fait échouer l'ingestion    |
| `AI_DAILY_CALL_CAP`            | Plafond global d'appels réels par jour                           |
| `AI_DAILY_CALL_CAP_PAR_COMPTE` | Part d'un seul compte dans ce plafond                            |
| `AI_DAILY_CALL_CAP_ANONYME`    | Part des essais sans compte dans ce plafond                      |
| `AI_MODEL`                     | Identifiant du modèle                                            |
| `AI_MAX_TOKENS`                | `max_tokens` par défaut, toujours envoyé                         |

`MOCK_AI` est le réglage à ne pas rater dans les deux sens : laissé à `true`, le
produit rend des fixtures identiques à tout le monde sans qu'aucune erreur ne le
signale. Le dimensionnement des trois plafonds est expliqué dans le README, à la
section « Appels au modèle » ; garder `AI_DAILY_CALL_CAP` nettement au-dessus de
`AI_DAILY_CALL_CAP_PAR_COMPTE` multiplié par le nombre de comptes actifs.

### Administration

| Nom            | Ce que c'est                                                            |
| -------------- | ----------------------------------------------------------------------- |
| `ADMIN_EMAILS` | Adresses autorisées à lire les signalements, séparées par des virgules. |

Vide n'autorise personne, et la page rend 404 pour qui n'y a pas droit : une
variable oubliée ferme la porte au lieu de l'ouvrir.

### Ce qui ne se pose pas en production

`SEED_USER_EMAIL` et `SEED_USER_TIMEZONE` ne servent qu'au compte de
démonstration du seed. `ANTHROPIC_BASE_URL` n'est lue que par la passe de
vérification d'abus, qui la détourne vers un port fermé. La base de production
n'est jamais seedée.

## L'ordre des opérations

1. **Créer le projet Neon de production**, en région européenne, et récupérer les
   deux chaînes de connexion (poolée et directe).
2. **Appliquer les migrations sur la base vierge**, depuis un poste :

   ```bash
   DIRECT_URL="<connexion directe de production>" npx prisma migrate deploy
   ```

   Vérifier ensuite que les tables sont là. Ne pas lancer le seed.

3. **Créer le projet Vercel** depuis le dépôt, sans déployer encore.
4. **Poser toutes les variables** sur l'environnement Production.
5. **Attacher le domaine**, puis poser `BETTER_AUTH_URL` sur ce domaine et
   déclarer l'URI de redirection Google correspondante.
6. **Déployer.**
7. **Vérifier la liste plus bas** avant d'envoyer l'adresse à qui que ce soit.

Les migrations suivantes sont **appliquées par la commande de build**, avant que
Next ne compile quoi que ce soit :

```json
"build": "prisma migrate deploy && next build --turbopack"
```

Ce n'était pas le cas au départ, et le motif d'alors était bon : un build de
prévisualisation pointant sur la base de production la migrerait sans qu'on
l'ait demandé. Le prix de ce choix s'est payé le 17 août — cinq migrations
oubliées, découvertes quand plus personne ne pouvait entrer dans son compte, la
connexion échouant à la première requête sur une colonne absente. Un schéma qui
ne suit pas le code n'est pas un oubli rattrapable : c'est une panne totale, et
elle se déclare au pire moment.

Le motif d'origine reste valable, il change simplement de forme : **un
environnement de prévisualisation ne doit jamais porter les connexions de
production.** Soit il n'a pas de variables du tout — et son build échoue, ce qui
est déjà le cas —, soit on lui donne une branche Neon à lui, et il migre alors sa
propre copie, ce qui est exactement le comportement voulu. La règle à tenir n'est
donc pas « ne pas migrer au build », c'est « ne jamais faire pointer une
prévisualisation sur la base de production ».

Une migration qui échoue arrête le déploiement. C'est voulu : mieux vaut ne pas
déployer que servir un code incapable de lire sa propre base.

## Les passages planifiés

Trois passages à déclencher, **depuis un service externe et non depuis
l'hébergeur** :

| Chemin              | Cadence           | Ce qu'il fait                                                                                                                      |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/jobs`    | toutes les 10 min | Reprend les jobs en attente ou morts en route, ferme ceux qui ont épuisé leurs tentatives, efface les essais anonymes non réclamés |
| `/api/cron/lots`    | toutes les 15 min | Relève les envois groupés terminés, soumet ceux qui attendent                                                                      |
| `/api/cron/rappels` | toutes les heures | Envoie le rappel quotidien à l'heure locale de chaque compte, et l'alerte de série à 21 h locales quand une série est en sursis    |

Les trois sont des `GET` et exigent l'en-tête `Authorization: Bearer <CRON_SECRET>`,
comparé en temps constant. C'est tout ce qu'ils demandent : ils ne connaissent
rien de l'hébergeur, et n'importe quel service capable d'appeler une URL avec un
en-tête fait l'affaire.

### Pourquoi un service externe

Le palier gratuit de Vercel limite le nombre de tâches planifiées et n'en
autorise qu'un passage quotidien — très loin des cadences ci-dessus. Déclarer ces
trois passages dans `vercel.json` y ferait échouer le déploiement, c'est pourquoi
le fichier ne porte que la région.

Un déclencheur externe coûte zéro et fait le même travail. Le jour où
l'hébergement passe à un palier qui autorise les crons natifs, il suffit de
remettre un bloc `crons` dans `vercel.json` et de couper le service externe :
aucune ligne de code ne change, parce que rien dans les routes ne dépend de qui
les appelle.

### Ce qu'il faut configurer

Pour chacun des trois, chez le déclencheur choisi :

- méthode `GET`, URL `https://<domaine>/api/cron/<nom>`
- en-tête `Authorization` valant `Bearer <CRON_SECRET>`
- la cadence du tableau ci-dessus

Vérifier ensuite que le service **envoie bien les en-têtes personnalisés** —
certains les ignorent en offre gratuite, et les routes répondent alors 401 en
silence. Un appel sans jeton doit renvoyer 401 : c'est le test le plus rapide que
la configuration est bonne, avant même de regarder les journaux.

`CRON_SECRET` doit exister dans l'environnement **avant** le premier
déploiement : sans elle, `isAuthorizedCron` refuse tout, jeton correct ou non.

### La cadence des rappels

Le passage horaire n'est pas négociable : la route compare l'heure **locale** de
chaque compte à son heure de rappel, et une cadence plus lâche sauterait des
fuseaux entiers. C'est le seul des trois où un retard se voit — les deux autres
rattrapent au passage suivant.

C'est aussi ce qui écarte les planificateurs qui décalent ou sautent des
exécutions sous charge : pour les jobs et les lots, un retard de dix minutes est
invisible ; pour un rappel quotidien, une heure de décalage le fait tomber dans
la mauvaise journée locale.

### Ce que le passage envoie vraiment

Deux emails partent de cette route, et chacun a son réglage par compte. Le rappel
quotidien ne part que s'il y a au moins un concept dû : à zéro il n'a rien à dire,
et un message quotidien qui annonce régulièrement qu'il n'y a rien à faire est un
message qu'on apprend à ne plus ouvrir. L'alerte de série ne part que si une série
est en cours, que rien n'a été revu dans la journée locale et qu'il reste quelque
chose à faire — la plupart des jours, elle ne part pas.

Les deux sont idempotents par compte, par type et par jour local : `EmailDelivery`
est consultée avant l'envoi et écrite après. Un passage rejoué à la même heure
n'envoie donc rien deux fois.

### Le plafond de durée

Les trois routes déclarent `maxDuration = 60`, le maximum du palier gratuit. La
reprise des jobs en traite trois par passage pour tenir dans cette minute, chacun
pouvant porter un appel modèle de dix à trente secondes. Si la file prend du
retard, ce sont ces deux valeurs qu'il faut relever **ensemble** — `BATCH_SIZE`
dans `app/api/cron/jobs/route.ts` et le `maxDuration` de la même route. L'une
sans l'autre ne sert à rien.

## La remise des emails

Trois choses décident qu'un email arrive dans la boîte de réception et non dans les
indésirables : le domaine d'envoi, la forme du message, et le comportement de
l'expéditeur. Les deux dernières sont dans le code et n'ont rien à configurer ; la
première est dans le DNS du domaine d'envoi.

### Ce qui doit exister dans le DNS

| Enregistrement             | Attendu                            | Pourquoi                                                           |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| SPF sur le sous-domaine    | l'`include` du fournisseur d'envoi | C'est ce domaine qui porte l'enveloppe, donc celui que SPF vérifie |
| DKIM (`resend._domainkey`) | la clé publique donnée par Resend  | Signe le message et l'aligne sur le domaine du `From`              |
| DMARC (`_dmarc`)           | au minimum `v=DMARC1; p=none;`     | Exigé par Gmail et Yahoo depuis 2024 pour tout envoi périodique    |

Le SPF du domaine racine n'entre pas en jeu : les envois du produit passent par le
sous-domaine que le fournisseur utilise comme chemin de retour. Un `-all` à la
racine pour la messagerie du domaine reste donc sans effet sur eux.

Le DMARC gagne à ne pas rester nu. Ajouter `rua=mailto:…` fait remonter des
rapports d'alignement, et une fois qu'ils sont propres, passer à `p=quarantine`
puis `p=reject` protège le domaine contre l'usurpation — ce qui, à son tour,
améliore la remise.

### Ce que le code tient déjà

- Une version texte à côté de chaque version HTML. Un email HTML seul est un signal
  d'indésirable à lui tout seul.
- Un préheader dans chaque message, pour que l'aperçu de la boîte ne montre pas le
  début du gabarit.
- `List-Unsubscribe` et `List-Unsubscribe-Post` sur les envois périodiques, et sur
  eux seuls : un code de connexion qui les porterait serait rangé avec les envois
  de masse.
- Aucun doublon : un envoi par compte, par type et par jour local.
- Une adresse d'expédition réelle plutôt qu'un `no-reply@`.
- Rien d'envoyé quand il n'y a rien à dire : l'engagement compte dans la réputation
  d'un expéditeur, et un message qu'on n'ouvre jamais abîme la remise des suivants.

### Ce qui reste hors de portée du code

`BETTER_AUTH_URL` doit valoir le domaine de production : les liens de session et de
désinscription en dérivent, et un lien vers `localhost` dans un email suffit à le
faire classer. Et un premier envoi depuis un domaine neuf tombe souvent en
indésirable quelle que soit la configuration — c'est de la réputation, elle se
construit avec le volume et les ouvertures.

## La région d'exécution

`vercel.json` fixe l'exécution à `fra1`, pour être dans le même centre de données
que la base. Sans ça, chaque requête traverse l'Atlantique deux fois par appel de
base — et les écrans de ce produit en font plusieurs.

## Une fois en ligne

- [ ] La page publique s'ouvre, et un dépôt sans compte rend vraiment des concepts
- [ ] Un second dépôt depuis la même visite est refusé
- [ ] La création de compte récupère les concepts de l'essai, et les décompte du
      plafond du mois
- [ ] Le code de connexion arrive, et il ouvre bien une session
- [ ] Le code saisi depuis l'application installée y ouvre la session, sans passer
      par le navigateur
- [ ] La connexion Google fonctionne sur le domaine de production
- [ ] La session survit à une fermeture du navigateur
- [ ] `/admin` rend 404 depuis un compte qui n'est pas dans `ADMIN_EMAILS`, et
      `/signalements`, son ancienne adresse, aussi
- [ ] L'export de données rend un fichier, la suppression de compte efface tout
- [ ] Les trois routes planifiées répondent avec le jeton, et refusent sans lui
- [ ] Le déclencheur externe les appelle vraiment — vérifier un passage dans ses
      journaux, pas seulement sa configuration
- [ ] Une ingestion réelle écrit bien une ligne dans `AiCall`, avec son coût
- [ ] Les pages légales et le lien de désinscription sont atteignables sans compte

Le dernier point n'est pas cosmétique : la désinscription doit fonctionner sans
session, parce que la personne qui clique est souvent déconnectée.
