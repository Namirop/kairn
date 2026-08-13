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
   personne ne peut se connecter, puisque le lien de connexion est la seule
   porte d'entrée avec Google.
4. **Un plafond de dépense dans la Console Anthropic**, avec une alerte à un
   seuil bas. C'est le seul garde-fou de budget qui ne dépend pas du code.

## Les variables d'environnement

Toutes se posent dans le projet Vercel, sur l'environnement **Production**.

### Base de données

| Nom            | Ce que c'est                                                               |
| -------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL` | Connexion applicative. Sur Neon, l'endpoint **poolé** (hôte en `-pooler`). |
| `DIRECT_URL`   | Connexion **directe**, sans pooler. Migrations et seed uniquement.         |

Les deux pointent la même base et ne diffèrent que par l'hôte. L'application ne
lit que `DATABASE_URL` ; `DIRECT_URL` n'est lue que par `prisma.config.ts`, parce
que le pooler en mode transaction casse les verrous consultatifs de Migrate.

### Authentification

| Nom                    | Ce que c'est                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Signature des sessions et des jetons de désinscription. **Secret neuf.** |
| `BETTER_AUTH_URL`      | URL publique du site, sans slash final.                                  |
| `GOOGLE_CLIENT_ID`     | Console Google Cloud. Sans lui et son secret, Google n'est pas proposé.  |
| `GOOGLE_CLIENT_SECRET` | Voir ci-dessus.                                                          |

L'URI de redirection à déclarer côté Google est `{BETTER_AUTH_URL}/api/auth/callback/google`.

`BETTER_AUTH_SECRET` ne doit **pas** être celui du développement : il signe les
cookies de session, et le partager entre deux environnements permet de forger une
session de production depuis une base de développement. Le changer déconnecte
tout le monde — d'où l'intérêt de le poser une bonne fois avant l'ouverture.

### Services externes

| Nom                 | Ce que c'est                                                   |
| ------------------- | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Clé de production, distincte de celle de développement.        |
| `RESEND_API_KEY`    | Sans elle, les emails sont journalisés au lieu d'être envoyés. |
| `EMAIL_FROM`        | Expéditeur, sur le domaine vérifié chez Resend.                |
| `CRON_SECRET`       | Jeton des routes cron. Voir la section « Les crons ».          |

### Garde-fous du modèle

| Nom                            | Valeur de production                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| `MOCK_AI`                      | `false` — sans quoi le produit sert des fixtures à tout le monde |
| `AI_ENABLED`                   | `true` — `false` coupe tout appel et fait échouer l'ingestion    |
| `AI_DAILY_CALL_CAP`            | Plafond global d'appels réels par jour                           |
| `AI_DAILY_CALL_CAP_PAR_COMPTE` | Part d'un seul compte dans ce plafond                            |
| `AI_MODEL`                     | Identifiant du modèle                                            |
| `AI_MAX_TOKENS`                | `max_tokens` par défaut, toujours envoyé                         |

`MOCK_AI` est le réglage à ne pas rater dans les deux sens : laissé à `true`, le
produit rend des fixtures identiques à tout le monde sans qu'aucune erreur ne le
signale. Le dimensionnement des deux plafonds est expliqué dans le README, à la
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

Les migrations suivantes se rejouent avec la même commande. Elles ne sont
volontairement **pas** câblées dans la commande de build : un build de
prévisualisation pointant sur la base de production la migrerait sans qu'on l'ait
demandé. Le prix de ce choix est qu'il faut y penser — une migration oubliée se
voit à la première requête sur une colonne absente.

## Les crons

Trois passages, déclarés dans `vercel.json` :

| Chemin              | Cadence           | Ce qu'il fait                                                                                                                      |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/jobs`    | toutes les 10 min | Reprend les jobs en attente ou morts en route, ferme ceux qui ont épuisé leurs tentatives, efface les essais anonymes non réclamés |
| `/api/cron/lots`    | toutes les 15 min | Relève les envois groupés terminés, soumet ceux qui attendent                                                                      |
| `/api/cron/rappels` | toutes les heures | Sélectionne les comptes dont l'heure locale correspond à leur heure de rappel                                                      |

Les trois exigent `Authorization: Bearer $CRON_SECRET`. Vercel pose cet en-tête
tout seul sur ses appels de cron dès que `CRON_SECRET` existe dans
l'environnement — il n'y a rien d'autre à câbler, mais il faut que la variable
soit là **avant** le déploiement, sinon les trois routes répondent 401 en silence.

Le passage horaire des rappels n'est pas négociable : la route compare l'heure
**locale** de chaque compte à son heure de rappel, et une cadence plus lâche
sauterait des fuseaux entiers.

**À vérifier avant de compter dessus** : les plans d'hébergement limitent le
nombre de tâches planifiées et leur fréquence, et le plan d'entrée de Vercel ne
permet historiquement qu'un passage quotidien. Trois tâches à la cadence
ci-dessus supposent un plan qui les autorise. C'est une dépense récurrente, donc
une décision, pas un détail d'installation.

## La région d'exécution

`vercel.json` fixe l'exécution à `fra1`, pour être dans le même centre de données
que la base. Sans ça, chaque requête traverse l'Atlantique deux fois par appel de
base — et les écrans de ce produit en font plusieurs.

## Une fois en ligne

- [ ] La page publique s'ouvre, et un dépôt sans compte rend vraiment des concepts
- [ ] Un second dépôt depuis la même visite est refusé
- [ ] La création de compte récupère les concepts de l'essai, et les décompte du
      plafond du mois
- [ ] Le lien de connexion arrive, et il ouvre bien une session
- [ ] La connexion Google fonctionne sur le domaine de production
- [ ] La session survit à une fermeture du navigateur
- [ ] `/signalements` rend 404 depuis un compte qui n'est pas dans `ADMIN_EMAILS`
- [ ] L'export de données rend un fichier, la suppression de compte efface tout
- [ ] Les trois routes cron répondent, et refusent un appel sans le jeton
- [ ] Une ingestion réelle écrit bien une ligne dans `AiCall`, avec son coût
- [ ] Les pages légales et le lien de désinscription sont atteignables sans compte

Le dernier point n'est pas cosmétique : la désinscription doit fonctionner sans
session, parce que la personne qui clique est souvent déconnectée.
