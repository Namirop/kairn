# Architecture

Comment un dépôt devient des questions, et ce qui protège le budget en chemin. Les commandes sont
dans [outillage.md](outillage.md), les variables dans [environnements.md](environnements.md).

## Le cycle d'un dépôt

```
dépôt (texte, capture facultative)
  │  requête HTTP : validation, place au quota, image réduite, Input écrit
  ▼
GenerationJob en file ── la requête rend la main ici ; after() lance le job, sinon le cron
  ▼
OCR       lecture de la capture s'il y en a une, puis effacement de ses octets
  ▼
ATOMS     découpage en concepts
  ▼
VARIANTS  quatre questions par concept, par groupes de trois concepts
  ▼
révision  sessions planifiées par FSRS sur l'Atom, entraînement libre
```

Aucun appel modèle n'a lieu dans une requête HTTP : chaque étape est un job, et chaque job passe
par `callAI()`.

## Le rangement

```
app/          (marketing) landing et champ de dépôt · (auth) · (app) application connectée
              (apercu) rendus isolés pour les captures · api/ crons, webhook, export, fuseau
components/   ui/ primitives retokenisées · cairn/ · un dossier par domaine
lib/          domain/ logique pure · db/ seul accès à Prisma · ai/ callAI et ses ponts
              jobs/ la file · depots/ le geste de dépôt · cron/ · images/ · auth/ · email/
              paiement/ · i18n/ · site/ · design/ · retours/
prisma/       schema/ multi-fichiers, seed/
scripts/      evaluation/ le banc · verification/ · maintenance/ · docs/
```

Le sens des dépendances est `app/` → `lib/db/` → `lib/domain/`, et
[eslint.config.mjs](../eslint.config.mjs) le rend mécanique : le SDK Anthropic ne s'importe que
dans [lib/ai/client.ts](../lib/ai/client.ts) et [son pont](../lib/ai/fournisseurs/anthropic.ts),
le client Prisma que dans `lib/db/`, Resend que dans `lib/email/`, et `lib/domain/` n'importe ni
Next ni React.

## Appels au modèle

### Un seul point d'entrée

[`callAI()`](../lib/ai/client.ts) est le seul chemin vers le modèle, parce qu'un garde-fou qu'un
second chemin peut contourner ne garde rien. Dans l'ordre :

1. Configuration effective : l'environnement, surchargé par ce que l'écran d'administration a posé
   en base ([reglages-effectifs.ts](../lib/ai/reglages-effectifs.ts)). Rien n'est mis en cache,
   une coupure prend effet à l'appel suivant.
2. Interrupteur `AI_ENABLED`, puis mode mock `MOCK_AI` : une fixture, rien de réservé ni
   d'enregistré.
3. Réservation des places.
4. Émission avec `max_tokens` explicite et un schéma de sortie dérivé du Zod.
5. Refus d'une réponse vide ou tronquée, validation Zod stricte.
6. Une ligne au registre `AiCall`, succès comme échec : modèle, tokens, coût, latence, bascule.

Une réponse coupée par `max_tokens` est un échec, jamais un résultat partiel : elle peut rester
valide au schéma, et c'est l'échec qui ne se voit pas.

### Deux ponts

Le pont ([lib/ai/fournisseurs/](../lib/ai/fournisseurs/)) est choisi par `AI_FOURNISSEUR`.
Absente, la variable vaut `anthropic` ([config.ts](../lib/ai/config.ts)).

| Pont         | Transport               | Schéma porté par                                  |
| ------------ | ----------------------- | ------------------------------------------------- |
| `anthropic`  | SDK natif               | `output_config.format`, `thinking` désactivé      |
| `openrouter` | `fetch` vers OpenRouter | `response_format`, sans paramètre de raisonnement |

Les modèles `openai/…` refusent nos schémas en mode strict : le pont OpenRouter les leur envoie
sans `strict`, recopiés en tête du prompt système, et la validation Zod tient la forme.

Le schéma est dérivé à la main ([schema-de-sortie.ts](../lib/ai/schema-de-sortie.ts)) et non par
l'assistant du SDK, qui rétrograde `enum` et `const` en simple description. Un mot-clé structurel
(`$ref`, `oneOf`, `if`…) fait lever avant l'ouverture du registre : une forme intraduisible est
une erreur de développement, pas un appel raté.

### Un repli, pas un retry

Quand l'appel tombe (requête en échec, sortie absente, invalide ou tronquée), le même pont réémet
une fois sur Sonnet, dont l'identifiant est fixé dans `MODELE_DE_REPLI` et non lu dans `AI_MODEL`.
Rejouer le même modèle reproduirait le plus souvent le même échec ; changer de modèle est la seule
seconde tentative qui achète quelque chose.

- Pas de repli quand le primaire est déjà Sonnet, ni quand l'appelant impose son modèle (les juges
  du banc).
- Le repli prend sa propre place au plafond global, pas de part de compte ni de part anonyme, qui
  comptent des demandes. Plafond atteint, pas de repli : l'échec du primaire remonte.
- Sa ligne porte `AiCall.basculee`. Au-delà de cinq bascules dans la journée (`SEUIL_BASCULES`),
  une alerte part à `EMAIL_ALERTES`.
- Le repli reste chez le fournisseur primaire : une panne d'OpenRouter lui-même n'est pas couverte.
  Le pont Anthropic reste câblé pour une bascule manuelle.

### Trois compteurs, deux places par appel

[reservation.ts](../lib/ai/reservation.ts) décide qui paie, [ai-quota.ts](../lib/db/ai-quota.ts)
tient les compteurs, une ligne par jour UTC.

| Compteur         | Table              | Variable                       | Protège                             |
| ---------------- | ------------------ | ------------------------------ | ----------------------------------- |
| Plafond global   | `AiCallQuota`      | `AI_DAILY_CALL_CAP`            | Le budget                           |
| Part d'un compte | `AiUserQuota`      | `AI_DAILY_CALL_CAP_PAR_COMPTE` | Les comptes les uns des autres      |
| Part sans compte | `AiAnonymousQuota` | `AI_DAILY_CALL_CAP_ANONYME`    | La landing et les comptes entre eux |

Chaque réservation tient dans une seule instruction `INSERT … ON CONFLICT DO UPDATE … WHERE` qui
incrémente et refuse d'un même mouvement. Compter les lignes d'`AiCall` avant d'émettre serait une
course : deux appels simultanés liraient la même valeur et passeraient tous les deux.

Un appel prend deux places : la part de qui le demande, puis la place globale. La part d'abord,
parce qu'elle se rend tant que rien n'est émis ; la place globale ne se rend jamais, un appel qui
échoue ayant pu consommer des tokens. Un compte prend sa part, un visiteur la part anonyme (un seul
seau pour tous), un appel interne (outil, banc) la seule place globale. Une reprise par le cron
garde la provenance de son dépôt.

Le refus global n'est pas un échec : [`executerLeJob`](../lib/jobs/runner.ts) remet le job en file
sans lui compter de tentative, et le dépôt reste en cours jusqu'au lendemain.

Ces plafonds se comptent en appels mais se règlent en dépense, lue au registre `AiCall` (chaque
ligne porte son coût, au tarif de [tarifs.ts](../lib/domain/tarifs.ts)). La part par compte borne
la vitesse d'un compte, pas sa dépense, que borne le quota mensuel de concepts. Le plafond global
est un coupe-circuit : atteint, il arrête tout le monde jusqu'au lendemain UTC, essai de la landing
compris.

## Génération

Un prompt système par intention ([lib/ai/prompts/](../lib/ai/prompts/)) : découper
(`extract_atoms`), écrire les questions (`generate_variants`), lire une capture (`ocr_extract`).
Aucun ne demande de JSON : la forme est portée par le schéma, et les deux ne peuvent pas diverger.

Un appel de questions porte jusqu'à trois concepts : trois amortit le mieux une consigne longue.
Les quatre questions d'un concept arrivent sous quatre clés nommées, une par facette : la forme
garantit une facette par question, sans contrôle après coup. La relecture
([schemas/](../lib/ai/schemas/)) ne fait jamais échouer un appel payé sur une sortie qui se
contredit : un motif de rejet cède aux concepts extraits, le premier de deux lots au même rang
l'emporte, et un lot inexploitable (QCM aux options indistinctes, trou absent, question vide)
disparaît seul, son concept repartant en file. Un groupe tronqué se coupe en deux
([reprise-du-lot.ts](../lib/jobs/reprise-du-lot.ts)) plutôt que de rejouer ce qui n'a pas tenu.

[lib/ai/fixtures/](../lib/ai/fixtures/) sert de niveau de qualité, pas seulement de bouchon :
sorties écrites à la main, de la phrase courte à l'article collé, de l'affirmation fausse marquée
douteuse à la liste de courses rejetée. Le cas se choisit par mot-clé, à défaut par longueur, donc
un même dépôt rend toujours la même chose.

Le banc ([scripts/evaluation/](../scripts/evaluation/), protocole dans
[campagne-modeles.md](campagne-modeles.md)) passe un corpus au vrai modèle et signale ce qui se
vérifie sans jugement humain ([controle-variants.ts](../lib/domain/controle-variants.ts)) ; la
qualité d'une question se juge à l'œil. Chaque commande exige `MOCK_AI=false` et ne dépense
qu'avec `--emettre`. Seule la passe de vecteurs d'`evaluer:mesures` sort de `callAI()`, chez
Voyage AI.

## Ingestion

Un dépôt part en une action ([deposer.ts](../lib/depots/deposer.ts)) : validation, place de la
période, capture réduite et relue par son décodeur, `Input` écrit, job en file. Une clé d'envoi
tirée à chaque affichage du formulaire rend le geste idempotent : deux clics n'écrivent qu'un
dépôt, et la place prise à tort est rendue.

Les octets de l'image ne survivent pas à sa lecture : une fois le texte obtenu, ils n'ont plus de
raison d'être, et ils sont effacés dans la même écriture. Toute fin de dépôt (rejet, panne,
clôture) les efface aussi : aucune capture ne survit à son dépôt.

Les questions suivent le découpage dans le même mouvement, parce que l'entraînement les rend utiles
dès le dépôt. Rien de ce qui a coûté un appel n'est jeté : un dépôt dont les questions échouent
garde ses concepts. Sur un dépôt factuel, un concept marqué douteux ne reçoit pas de questions
([`conceptsAQuestionner`](../lib/domain/nature-du-depot.ts)), pour ne pas river une erreur que
personne n'a vérifiée. Sur une fiction ou un dépôt personnel, tous en reçoivent : les règles d'un
jeu seraient sinon toutes douteuses, et le dépôt compterait au quota sans rien produire.

### Les limites du geste

[quota-depots.ts](../lib/db/quota-depots.ts) prend ou refuse la place, chaque compteur en une seule
instruction.

| Limite               | Valeur                                                                | Rôle                                                       |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Concepts par période | 50 en gratuit, 500 en payant                                          | Plafond commercial                                         |
| Dépôts par période   | deux fois le plafond de concepts                                      | Un dépôt rejeté paie son extraction sans rendre de concept |
| Débit des dépôts     | 3 par minute                                                          | Protège le serveur, pas le budget                          |
| Gestes de révision   | 120 par minute ([limite-de-gestes.ts](../lib/db/limite-de-gestes.ts)) | Même mécanisme, sans appel modèle                          |

La période est mensuelle, ancrée au jour d'inscription, lue dans le fuseau de l'utilisateur. Le
plafond porte sur le concept parce que c'est lui qui coûte : déposer une phrase ne doit pas coûter
autant que coller un article. Un dépôt passe tant qu'il reste une place, donc le dernier de la
période peut dépasser le plafond, d'où le « environ » à l'écran. Un redécoupage prend une place.

Un dépôt en panne rend sa place ([fin-de-depot.ts](../lib/db/fin-de-depot.ts)) ; un dépôt rejeté
la garde, la chaîne a tourné. Au plafond de concepts, un compte gratuit se voit proposer le plan
payant quand le paiement est ouvert ; sinon, et au plafond de dépôts, une liste d'attente.

## Le dépôt avant compte

La landing porte le champ de dépôt ([deposer-sans-compte.ts](../lib/depots/deposer-sans-compte.ts)).
On dépose, les concepts s'affichent, et c'est ensuite qu'on propose un compte. `Input` et `Atom`
sont rattachés à une `AnonymousSession` désignée par un cookie ; l'inscription les transfère au
compte depuis le hook `user.create.after` de better-auth
([reprise-de-visite.ts](../lib/auth/reprise-de-visite.ts)), seul instant où l'on tient à la fois
le compte neuf et le cookie.

C'est le seul endroit qui dépense sans compte, donc le plus serré : 4 000 signes au plus, pas
d'image (sa lecture doublerait le coût d'un visiteur), et un seul concept questionné, l'échantillon
que la landing montre. Les autres questions partent à la création du compte, là où quelqu'un
s'engage.

| Verrou                  | Valeur                                                      |
| ----------------------- | ----------------------------------------------------------- |
| Par visite (cookie)     | deux essais par 24 h glissantes, plus deux pannes tolérées  |
| Par empreinte d'adresse | deux visites par 24 h glissantes                            |
| Conservation            | sept jours, puis le cron efface ce que personne n'a réclamé |

Les deux essais sont dus quel que soit leur résultat : le premier texte est souvent collé pour
voir. Une panne ne coûte pas d'essai, un rejet si. La fenêtre glissante rouvre la même visite le
lendemain, sur le même cookie, car la reprise au compte passe par lui.

Deux visites par adresse et non une, parce qu'une adresse ne désigne pas une personne : un bureau
ou un opérateur mobile sous CGNAT sortent par une seule IPv4. Ce verrou freine le passant qui
recommence ; c'est la part anonyme et le plafond global qui bornent la dépense. Aucune IP n'est
conservée : `AnonymousSession.ipHash` porte un SHA-256 tronqué, salé par `BETTER_AUTH_SECRET`.

## Compte et données

Un compte exporte ses dépôts et sa progression en JSON (`GET /api/mon-compte/export`) et se
supprime lui-même, tout partant par les cascades du schéma. Les emails portent un lien de
désinscription signé, utilisable sans connexion : sortir ne doit pas demander de rentrer.

## Travaux asynchrones

`after()` lance chaque job derrière la réponse ([queue.ts](../lib/jobs/queue.ts)). L'exécuteur ne
retente rien : seul un job resté en attente, ou mort en route depuis plus de dix minutes, est repris
par le cron, au plus trois fois. Quelle que soit l'étape qui échoue, une seule fonction referme le
dépôt (`marquerPretSiPlusRienEnAttente`) et elle garde les concepts déjà écrits.

| Route                                                   | Rôle                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`/api/cron/jobs`](../app/api/cron/jobs/route.ts)       | Ferme les jobs épuisés, efface les visites non réclamées, reprend trois jobs au plus            |
| [`/api/cron/rappels`](../app/api/cron/rappels/route.ts) | Rappel à l'heure locale si un concept est dû, alerte de série à 21 h, relance des comptes vides |

Les deux exigent `Authorization: Bearer $CRON_SECRET` ([autorisation.ts](../lib/cron/autorisation.ts))
et signalent un battement à chaque passage abouti : c'est le silence qui alerte. Un email part une
fois par compte, par type et par jour local (`EmailDelivery`). Les cadences sont dans
[deploiement.md](deploiement.md).

## Vérification

Les tests unitaires couvrent `lib/domain/` et quelques modules purs ([vitest.config.mts](../vitest.config.mts)).
Le reste se prouve à l'exécution, contre une vraie base :

| Commande                 | Ce qu'elle prouve                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `verifier:ai`            | Rien ne sort en mock ; le plafond refuse avant d'émettre et tient sous 25 réservations simultanées |
| `verifier:ingestion`     | Le pipeline de bout en bout, échecs, quotas, dépôt sans compte et sa reprise                       |
| `verifier:session`       | Révision, série autour de minuit local, suppression de compte sans ligne restante                  |
| `verifier:abus`          | Compteurs sous concurrence, remboursement, propriété des ressources, repli                         |
| `verifier:depot-anonyme` | Le chemin public sur un corpus, à sec sauf `--emettre`                                             |

Les quatre premières arment un piège sur `fetch` et échouent si une requête part vers un hôte de
modèle ; ces hôtes sont listés dans
[hotes-des-fournisseurs.ts](../scripts/verification/cases/hotes-des-fournisseurs.ts), où tout pont
ajouté doit être déclaré.
