# Le paiement : Stripe, et pourquoi il est branché comme ça

Ce document explique la logique du paiement, pas la liste des fichiers. Il est écrit pour qu'on
puisse y revenir dans six mois, ou repartir de zéro sur un autre projet sans refaire les mêmes
découvertes.

---

## Ce que Stripe fait, et ce qu'on lui laisse faire

Stripe est une caisse. On lui confie exactement trois choses, et pas une de plus.

**La saisie de carte.** Elle se fait sur une page hébergée par Stripe (Checkout), jamais chez nous.
C'est une décision de sécurité avant d'être une décision de design : **un numéro de carte qui ne
traverse jamais ce serveur est un numéro qu'aucune faille d'ici ne peut fuiter.** Ce que ça coûte —
une page qui n'est pas à nos couleurs, le temps d'un aller-retour — est le bon prix. Le corollaire
est qu'aucun formulaire de Kairn ne demandera jamais un numéro de carte : si un jour il en existe
un, c'est un incident.

**Le calendrier des abonnements.** Facturer tous les mois, relancer une carte qui échoue, arrêter
au terme. Ce sont des semaines de travail qu'on n'écrit pas.

**La mémoire de qui paie.** Stripe est la source de vérité ; notre base n'en est qu'un reflet, tenu
à jour par les webhooks.

Tout le reste — qui a droit à quoi, ce que ça ouvre dans le produit, quand ça se coupe — est à
nous, en clair, dans `lib/domain/`.

---

## Les objets Stripe, dans l'ordre où on les rencontre

| Objet          | Ce que c'est                                         | Qui le crée                     |
| -------------- | ---------------------------------------------------- | ------------------------------- |
| `Product`      | Ce qu'on vend — un seul pour Kairn                   | Nous, une fois, à la main       |
| `Price`        | Un montant et une cadence sur ce produit             | Nous, une fois, à la main       |
| `Customer`     | Une personne, ses moyens de paiement, ses factures   | **Notre code**, à la 1re visite |
| `Subscription` | Un abonnement en cours, avec son statut et son terme | Checkout, quand on paie         |
| `Invoice`      | Une facture, émise à chaque échéance                 | Stripe, tout seul               |

Deux choix structurants se cachent là-dedans.

**Un produit, deux prix.** Le mensuel et l'annuel ne sont pas deux produits : ils ouvrent le même
plafond et ne diffèrent que par leur rythme de facturation. Deux produits auraient dupliqué la
description, la fiche, et le risque qu'elles divergent.

**Le client Stripe est créé par nous, avant tout paiement.** C'est contre-intuitif — Checkout sait
le faire — mais c'est ce qui rend les webhooks lisibles. Un abonnement créé par Checkout arrive
avec un client qu'on n'a jamais vu, et il faut alors le rattacher depuis les métadonnées de la
session : on dépend d'un champ que le premier événement porte et que les suivants ne portent plus.
Créer le client d'abord **retourne la dépendance** : quand un événement arrive, on sait déjà de qui
il parle. C'est aussi ce qui fait qu'un réabonnement retombe dans le même dossier, avec un
historique de factures d'un seul tenant.

### Les prix se désignent par une clé, jamais par leur identifiant

Un `price_…` est propre à un environnement : celui du mode test n'existe pas en production. Les
inscrire dans le code obligerait à une variable d'environnement par prix, et à se souvenir de la
changer le jour de la mise en production — c'est-à-dire au moment précis où l'on a le plus de
choses en tête.

Une `lookup_key` (`kairn_mensuel`, `kairn_annuel`) est la même des deux côtés. Le code ne connaît
qu'un nom, et **vérifie le montant contre ce que la page annonce avant de vendre**. Si les deux
divergent, on refuse la vente au clic sur « Payer » plutôt que d'encaisser un montant différent de
celui qui est affiché. Un prélèvement qu'on découvre après n'est pas un bug d'affichage.

---

## Test et production : deux mondes étanches

C'est la source d'erreur la plus commune sur Stripe, alors autant l'énoncer.

Le mode test et le mode production sont **deux jeux de données complètement séparés** sur le même
compte. Les clés, les clients, les produits, les prix, les abonnements, les webhooks : rien ne
traverse. Un catalogue créé en test n'existe pas en production, et devra y être recréé **avec les
mêmes `lookup_key` et les mêmes montants**.

Deux propriétés à connaître avant de créer quoi que ce soit :

- **`tax_behavior` est immuable.** Un prix « TTC » (`inclusive`) ne peut pas devenir « HT » : il
  faut créer un nouveau prix. Kairn est en `inclusive` — 7 €, c'est ce que le client paie.
- **Le secret d'un endpoint webhook n'est montré qu'à sa création.** D'où la règle de ne créer
  l'endpoint de production qu'au moment de la bascule, et pas avant : un secret qui traîne pendant
  des semaines est un secret qui fuit.

---

## Qui décide qu'un compte est payant

**Le webhook, et lui seul.** C'est la règle la plus importante du dossier.

Ni la page de retour après paiement, ni l'écran de l'offre, ni la session Checkout n'ouvrent de
droit : toutes peuvent être atteintes par quelqu'un qui n'a rien payé — il suffit de connaître
l'URL. Le webhook, lui, porte une **signature cryptographique** que seul Stripe peut produire.
C'est ce qui fait qu'on peut le croire.

Conséquence dans le code : `lib/db/ecriture-de-labonnement.ts` est le seul module qui accorde un
plan, et il est séparé de celui qui le lit. Rien ne peut rendre un compte payant par mégarde en
important le module qui sert à l'afficher — un abonnement offert ne se voit pas, il ne produit ni
erreur ni réclamation.

### Trois pièges du webhook, et leur réponse

**1. La signature porte sur les octets bruts.** Le route handler lit du texte, jamais du JSON.
Reparser puis resérialiser, même à l'identique, change les octets et casse la vérification. C'est
la seule raison pour laquelle cette route ne ressemble pas aux autres.

**2. Stripe ne garantit pas l'ordre, et rejoue.** Deux événements partis à une seconde d'écart
peuvent arriver à l'envers, et le plus ancien écraserait le plus récent — un renouvellement effacé
par la résiliation qui l'a précédé, un mois payé perdu sans un bruit. On garde donc la date du
dernier événement traité, et on refuse tout ce qui est plus ancien.

La règle est vérifiée **deux fois, et ce n'est pas une redondance** : une fois dans une fonction
pure et testée qui dit _pourquoi_, une fois dans le `where` de l'instruction SQL qui _empêche_.
Sans la seconde, deux webhooks traités en parallèle liraient tous les deux l'ancienne valeur et le
plus vieux gagnerait une fois sur deux. Cette garantie-là n'est pas dans le TypeScript, elle est
dans l'atomicité de Postgres — et c'est pour ça qu'elle se vérifie contre une vraie base
(`npm run verifier:abonnement`).

**3. Les codes de retour parlent à Stripe**, qui relance pendant trois jours ce qu'il n'a pas
réussi à livrer. `400` dit « n'insiste pas, ta requête est mauvaise » ; `500` dit « réessaie, c'est
moi » — et c'est le bon code quand notre catalogue est cassé, parce que la relance réussira une
fois réparé. Un événement dont on n'a rien à faire est **ignoré avec un `200`**, jamais refusé :
répondre en erreur ferait relancer Stripe pour rien et finirait par faire couper l'endpoint.

---

## Les statuts, et lesquels ouvrent un droit

Stripe a huit statuts d'abonnement. Deux ouvrent le plan payant : `active` et `trialing`. Le choix
se joue sur `past_due`, et il est délibéré : quand un renouvellement échoue, Stripe avance quand
même le terme et relance la carte pendant des semaines. Accorder le plan pendant ce temps
offrirait un mois entier à qui n'a rien payé.

**Attention à ne pas confondre deux questions distinctes** — c'est un piège qui a coûté un bug :

- _« Ouvre-t-il un droit ? »_ → `active` et `trialing` seulement.
- _« Existe-t-il encore ? »_ → tout sauf `canceled` et `incomplete_expired`.

Un abonnement `past_due` ne donne accès à rien **mais existe toujours** : il relance la carte et
repartira au premier paiement réussi. C'est la seconde question qui interdit un second achat — sans
elle, on se retrouve avec deux abonnements dont l'un est déjà en incident.

---

## Ce qu'on ne laisse pas faire à Stripe

**Managed Payments** est le mode « marchand de référence » : Stripe devient le vendeur, collecte et
reverse la TVA dans plus de quatre-vingts pays, émet les factures et les emails, prend en charge la
fraude et les litiges. Il est **activé par défaut** sur les comptes récents, et il exige un code de
taxe sur chaque produit — sans quoi **toute session Checkout est refusée**. C'est le premier défaut
qu'a trouvé l'épreuve du parcours réel.

Kairn le refuse explicitement dans le code, et non par une case du tableau de bord : c'est une
décision de facturation, elle doit se lire dans le code qui vend. Le calcul : **3,5 % par
transaction en plus** des frais de paiement, dès le premier euro, contre un service qui ne sert
qu'au-delà de 10 000 € de ventes annuelles à des particuliers du reste de l'UE.

**Le choix se pose avant le premier client**, parce qu'il n'est qu'à moitié réversible : Managed
Payments s'active plus tard pour les seuls abonnements souscrits après. Ceux d'avant n'y sont
jamais éligibles.

---

## Le portail, et le partage des gestes

Stripe fournit un portail hébergé où le client gère son abonnement. On ne lui donne pas tout.

- **Arrêter et reprendre** restent dans Kairn. Un abonnement qu'on ne peut résilier que sur un site
  tiers est un abonnement qu'on rend difficile à quitter, et ce produit n'a pas envie d'être
  celui-là. Ça coûte deux boutons ; ça vaut de ne jamais écrire « rendez-vous sur le portail de
  notre prestataire pour vous désabonner ».
- **Les factures et le changement de carte** vont au portail : ce sont des écrans entiers à
  construire et à maintenir pour un usage rare, et Stripe les fait mieux.

Noter que **résilier ne supprime rien** : ça lève un drapeau (`cancel_at_period_end`) et laisse
l'abonnement courir jusqu'à son terme. C'est la date qui coupe, pas le geste — donc reprendre est
un simple retour en arrière, sans nouveau paiement.

La configuration du portail est écrite dans le code, pas réglée dans le tableau de bord, et elle se
retrouve par une métadonnée plutôt que par un identifiant — même raison que les `lookup_key` du
catalogue. `npm run eprouver:paiement -- portail` la relit depuis Stripe et constate le partage :
c'est le seul moyen de savoir qu'elle n'a pas été modifiée entre-temps depuis le tableau de bord.

Deux emails de Stripe restent utiles, et ils ne se règlent **que** dans le tableau de bord, jamais
par l'API : les reçus de paiement, et la relance en cas d'échec de carte. La seconde reste le seul
chemin pour qui ne revient pas de lui-même sur l'application.

---

## La TVA, quand on est en franchise

Kairn est vendu par une micro-entreprise en **franchise en base** : rien n'est collecté, et la
mention « TVA non applicable, article 293 B du CGI » est obligatoire sur chaque facture.

Elle est posée sur le **client** Stripe et non sur la facture. Stripe la recopie alors sur toutes
celles qu'il émettra, renouvellements compris, que notre code ne verra jamais passer. L'attacher à
la facture obligerait à intercepter chaque échéance pour y ajouter une phrase obligatoire.

Un drapeau (`TVA_COLLECTEE`) et la mention disent la même chose sous deux formes, et un test
verrouille leur accord : le jour où le seuil est franchi, la mention devient un mensonge — elle
affirmerait le contraire de ce qui est débité — et c'est le genre de changement qu'on fait à
moitié.

**Les seuils bougent, ne les citer de mémoire sous aucun prétexte.** État vérifié sur sources
officielles au 2 septembre 2026 :

- Franchise en base française, prestations de services : **37 500 €**, seuil majoré **41 250 €**.
- Seuil européen de **10 000 €** : il porte sur les ventes aux particuliers des **autres** pays de
  l'UE, hors France, agrégées et hors taxes. Au-delà, la TVA devient celle du pays de l'acheteur.
- Au-delà, **deux portes et non une seule** : le guichet OSS avec collecte de la TVA de chaque
  pays, ou la **franchise en base de TVA européenne** — ouverte depuis le 1er janvier 2025, sous
  100 000 € de chiffre d'affaires dans l'Union, via un numéro « EX » et une déclaration
  trimestrielle. La seconde ne coûte aucune commission. À faire confirmer par un comptable le jour
  où le seuil approche.

---

## Les garde-fous

Le paiement est l'endroit du produit où une erreur coûte de l'argent réel à quelqu'un d'autre. Trois
verrous, dans le même esprit que `MOCK_AI` pour le modèle :

1. **Le mode test est le défaut par construction.** Une clé `sk_live_` est refusée tant que
   `PAIEMENT_LIVE=true` n'est pas posée : le paiement reste fermé, et le journal dit pourquoi. Le
   geste dangereux doit être énoncé ; il ne s'obtient pas en collant la mauvaise ligne dans la
   mauvaise colonne d'une interface d'hébergeur.
2. **Sans clés, le paiement est fermé et le dit.** `paiementOuvert()` rend faux, l'écran annonce que
   le paiement n'est pas ouvert — ce qui est vrai — plutôt que d'exposer un bouton qui casse.
3. **La configuration est lue à chaque usage**, pas au chargement du module : couper le paiement
   chez l'hébergeur prend effet sans redémarrage.

S'y ajoutent deux règles de code : un seul module instancie le SDK, et un seul module accorde un
plan.

### La version d'API, épinglée

`lib/paiement/client.ts` épingle la version d'API Stripe (`2026-09-30.endive`). Sans elle, une mise à
jour du paquet changerait en silence la forme des réponses, et le droit d'un compte payant dépend
de `current_period_end` lu sur la ligne de l'abonnement.

Les webhooks, eux, ne suivent pas le code : les endpoints n'ont pas de version propre et reçoivent
leurs événements dans la **version par défaut du compte**, réglée dans le tableau de bord. Monter la
version se fait donc en deux temps, dans cet ordre :

1. Changer `apiVersion` dans le code, puis éprouver le parcours (ci-dessous) deux fois : avec
   `stripe listen`, qui émet dans la version par défaut du compte, puis avec `stripe listen --latest`,
   qui émet dans la plus récente. Le code doit accepter les deux, car la prod enverra l'ancienne
   version jusqu'au second temps.
2. Après le déploiement, passer la version par défaut du compte dans le tableau de bord, en live
   puis dans la sandbox.

---

## Développer et éprouver en local

Le tunnel de webhooks passe par la CLI de Stripe. Sans lui, rien ne revient : l'achat aboutit chez
Stripe, et le compte reste gratuit.

```bash
stripe login                                                    # une fois
stripe listen --forward-to localhost:3000/api/paiement/webhook  # à laisser tourner
npm run eprouver:paiement -- ouvrir --compte=moi@exemple.fr
```

La carte de test est `4242 4242 4242 4242`, avec n'importe quelle date future et n'importe quel
CVC. Les gestes suivants : `etat`, `arreter`, `reprendre`, `nettoyer`.

Deux pièges de la CLI :

- **Le port compte.** `BETTER_AUTH_URL` est fixé sur 3000 ; un serveur qui bascule sur 3001 parce
  qu'un processus orphelin tient le port laisse une session invalide et une erreur incompréhensible.
- **En mode live, la CLI exige `--live` sur chaque commande** en plus d'avoir basculé de contexte.
  C'est une double sécurité : ne pas la contourner.

En mode test, Stripe **n'envoie pas** ses emails clients, sauf à une adresse du compte ou d'un
domaine vérifié.

---

## Ce qui se transpose ailleurs

Six choses, indépendantes de Kairn :

1. **La carte ne traverse jamais ton serveur.** Page hébergée, toujours. Ce que tu perds en contrôle
   visuel, tu le gagnes en n'ayant aucune obligation de conformité à porter.
2. **Un seul chemin accorde un droit, et c'est le webhook signé.** Tout ce qui vient du navigateur
   est une supposition — y compris la page de retour après paiement.
3. **Les webhooks arrivent en désordre et se rejouent.** Garde la date du dernier événement traité,
   et fais porter le verrou par la base, pas par ton langage.
4. **Désigne le catalogue par des clés, pas par des identifiants**, et vérifie le montant contre ce
   que ta page annonce avant d'encaisser.
5. **Sépare « ouvre un droit » de « existe encore ».** Ce sont deux questions, et les confondre
   produit soit des accès offerts, soit des doubles facturations.
6. **Éprouve le parcours en vrai avant le premier client.** Un réglage de compte que tu n'as pas
   choisi peut rendre tout achat impossible sans qu'aucun test ne bronche.
