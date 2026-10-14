# L'outillage : scripts, vérifications, `package.json`

Ce document explique **pourquoi** le dépôt a les commandes qu'il a, et comment décider où ranger
une nouvelle. Le README, lui, liste ce qu'elles font. Les principes ci-dessous ne sont pas propres
à Kairn : ils valent pour n'importe quel projet du même genre.

---

## Les outils, et ce que chacun couvre

| Outil                  | Ce qu'il vérifie                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **TypeScript** (`tsc`) | Ce qui est vrai à la compilation : formes, exhaustivité des `switch`                                                    |
| **ESLint**             | Les règles qu'un type ne dit pas, dont les frontières entre dossiers                                                    |
| **Prettier**           | La forme du code, pour que les diffs ne portent que du sens                                                             |
| **Vitest**             | La logique pure de `lib/domain/` et quelques modules purs de `lib/ai/`, `lib/paiement/` et du banc, sans base ni réseau |
| **fast-check**         | Les règles vraies pour **toutes** les entrées, pas trois exemples choisis                                               |
| **knip**               | Le code mort : fichiers, exports et dépendances que rien n'atteint (en CI)                                              |
| **tsx**                | Exécute un `.ts` directement, sans étape de build — tous les scripts                                                    |
| **Prisma CLI**         | Le schéma, les migrations, la console de base                                                                           |
| **Stripe CLI**         | Le tunnel de webhooks vers la machine locale, et le catalogue                                                           |

`tsx` mérite un mot : c'est lui qui rend les scripts possibles. Sans lui, chaque vérification
demanderait une compilation séparée ou un fichier JavaScript à part, et personne n'en écrirait.

---

## Trois registres de commandes, à ne pas mélanger

C'est le principe central, et le seul qui demande de la discipline dans le temps.

### 1. Le cycle de vie

`dev`, `build`, `start`, `test`, `lint`, `typecheck`, `format`, `db:*`. Elles existent dans tout
projet, tout le monde les connaît, elles ne bougent jamais. Rien à décider.

### 2. Les vérifications durables

Elles exercent des invariants que les tests unitaires **ne peuvent pas** atteindre, et elles
restent tant que le sujet existe. Chez Kairn : `verifier:ai`, `verifier:ingestion`,
`verifier:session`, `verifier:abus`, `verifier:abonnement`, `verifier:contrastes`,
`verifier:depot-anonyme`, `verifier:openrouter`, `eprouver:paiement`.

### 3. Les chantiers ponctuels

Une campagne d'évaluation, une migration de fournisseur, un banc de mesure mené une fois. Elles
servent quelques jours, puis le chantier se ferme.

**Une fois le chantier clos, la commande sort de `package.json`.** Le fichier, lui, reste tant
qu'un chantier du même genre peut le reprendre (une campagne suivante relance les mêmes scripts) ;
il sort aussi quand plus rien ne le rappellera, et git le garde. Le remettre coûte une ligne. Ce qui sort, c'est la ligne du
`package.json`, parce que `npm run` doit lister **ce qu'on peut faire aujourd'hui**, pas
l'archéologie du projet. Une liste de quarante commandes dont dix sont mortes ne se lit plus, et
la première conséquence est qu'on cesse de la lire — y compris pour les dix qui comptent.

### Où vit chaque script

`scripts/` se range par usage, un dossier par famille. Un script n'est jamais importé par
l'application.

| Dossier         | Ce qu'il contient                                                                    |
| --------------- | ------------------------------------------------------------------------------------ |
| `verification/` | Les vérifications durables, et dans `cases/` les cas et le carnet qu'elles partagent |
| `evaluation/`   | Le banc d'évaluation des modèles : ses commandes, ses modules, son corpus            |
| `maintenance/`  | Les réparations de données en production et les lectures de registre                 |
| `brand/`        | L'export de la marque et des icônes depuis la géométrie du cairn                     |
| `assets/`       | La banque de captures et de vidéos (voir son `README.md`)                            |
| `docs/`         | Le contrôle des docs à relire                                                        |

---

## La pyramide de vérification

Trois étages, du moins cher au plus cher. **Ne monte d'un étage que ce que l'étage du dessous ne
peut pas prouver.**

### Étage 1 — Les tests unitaires, sur du pur

`lib/domain/` ne connaît ni Next, ni Prisma, ni le réseau. Ses fonctions prennent des valeurs et
rendent des valeurs, l'instant courant compris — c'est pour ça qu'elles se testent gratuitement, et
que tout ce qui est intéressant y a été poussé.

Quand une règle est vraie pour toutes les entrées — un ordre qui se conserve, un signe qui
s'inverse, un résultat déterministe — elle s'écrit en propriété fast-check plutôt qu'en trois
exemples. Une propriété qui échoue est un bug : on corrige le code, jamais la propriété.

### Étage 2 — Les vérifications contre une vraie base

Certaines garanties ne sont pas dans le TypeScript. Elles sont dans le `where` d'une instruction
Postgres, et seule une vraie base peut les prouver :

- deux webhooks traités **en même temps** ne doivent pas laisser le plus ancien gagner ;
- vingt-cinq réservations parties au même instant ne doivent pas dépasser le plafond ;
- supprimer un compte ne doit laisser **aucune ligne** dans **aucune** table.

Ces scripts créent un compte de vérification, jouent le scénario, puis effacent. Ils écrivent leurs
constats dans un carnet (`scripts/verification/cases/journal.ts`) et concluent d'un bloc : une
vérification se lit d'un coup, pas au fil de l'eau. Chaque constat est formulé comme la règle qu'on
veut voir tenir — de sorte qu'une ligne en échec soit un **trou**, et non une panne du script.

### Étage 3 — Les épreuves contre un vrai service

Le dernier étage ne prouve qu'une chose, mais elle est irremplaçable : que la forme réelle des
objets d'un service tiers correspond à ce que le code croit. Aucune fixture ne le dira jamais — une
fixture est écrite d'après la même lecture que le code, donc elle reproduit fidèlement le
malentendu.

`eprouver:paiement` en est l'exemple : il a trouvé, dès sa première exécution, que **plus aucun
achat ne pouvait aboutir** — un réglage du compte Stripe exigeait un champ que le catalogue n'avait
pas. Le code était juste, les tests verts, et rien n'aurait signalé le problème avant le premier
client.

Ces épreuves ne tournent pas seules et ne rejoignent pas la suite : elles demandent des clés, un
tunnel ouvert, parfois un navigateur au milieu. **D'où leur nom : `eprouver:` et non `verifier:`.**
On les lance à la main, quand on touche au sujet.

---

## Ce qui décide de l'étage

Une question, dans cet ordre :

1. La règle est-elle exprimable sur des valeurs pures ? → **étage 1**, et pousse la règle dans
   `lib/domain/` si elle n'y est pas.
2. Dépend-elle de la concurrence, d'une contrainte SQL, d'une cascade ? → **étage 2**.
3. Dépend-elle de la forme réelle d'un objet venu d'ailleurs, ou d'un secret ? → **étage 3**.

La question n'est jamais « est-ce testable » mais « qu'est-ce qui serait faux si je me trompais ».
Un plafond de dépenses mal compté vide un compte en banque ; une couleur mal choisie se rattrape.
On teste là où l'erreur coûte, pas au prorata d'un pourcentage de couverture.

---

## Nommer une commande

Le préfixe dit le registre, pas le sujet :

- `db:` — tout ce qui parle au schéma ou à la base.
- `verifier:` — une vérification qui tourne seule, sans clé ni service tiers.
- `eprouver:` — une épreuve contre un vrai service, lancée à la main.

- `evaluer:` — le banc d'évaluation de la génération, qui mesure et dépense.
- `exporter:` — ce qui sort du dépôt : images, marque.

Deux commandes portent `verifier:` sans en suivre toute la règle : `verifier:openrouter` interroge
le catalogue d'OpenRouter avec la clé du banc, sans rien dépenser, et `verifier:depot-anonyme`,
à sec par défaut, appelle le modèle quand on lui passe `--emettre`.

Quatre commandes restent hors de ces registres parce qu'elles n'en forment pas un à elles seules :
`lire:cache`, `depot:code`, `regenerer:questions` et `reparer:affirmations`.

---

## Les commandes retirées

Six commandes sont sorties du `package.json` en application de la règle ci-dessus. **Leurs
fichiers sont restés dans `scripts/evaluation/`**, parce qu'une campagne suivante les reprendra.
On les relance à la main :

```bash
npx tsx scripts/evaluation/<le-fichier>.ts
```

| Commande retirée                          | Pourquoi                                      |
| ----------------------------------------- | --------------------------------------------- |
| `planifier:campagne`, `lancer:campagne`   | Campagne d'évaluation de modèles n°1, close   |
| `planifier:campagne2`, `lancer:campagne2` | Campagne n°2, close — le modèle est arbitré   |
| `valider:juge`                            | Le juge de ces campagnes                      |
| `eval:ablation` (`eprouver-la-mesure.ts`) | Épreuve de l'instrument de mesure, concluante |

Les deux scripts du portage vers OpenRouter (`valider:staging`, `valider:bascule`) ont été
supprimés : le portage est livré, et rien ne les rappellera. L'historique git les garde.

---

## Les docs suivent le code

Une doc fausse coûte plus cher qu'une doc absente : on la croit. Le risque est le plus fort pendant
une série de modifications, quand le code bouge et que personne ne rouvre le document qui le décrit.

`scripts/docs/doc-map.ts` dit quelle doc décrit quelle partie du code. `npm run docs:check` compare
cette carte à ce qui a changé sur la branche (commits depuis `main`, fichiers modifiés et fichiers
nouveaux) et nomme chaque doc dont le code a bougé sans qu'elle bouge. La commande signale aussi
les chemins de la carte qui n'existent plus, pour que la carte ne pourrisse pas à son tour.

Le contrôle dit « à relire », jamais « faux » : une correction au milieu d'une fonction change
rarement ce qu'un document raconte. Il ne bloque donc ni le commit ni la CI. Il sert à
l'assistant de code, qui le lance en fin de tour et relit la doc qu'il nomme ; chaque fichier n'est
signalé qu'une fois par branche.

Ajouter une doc, ou un dossier qu'une doc décrit, c'est ajouter une ligne à la carte.

## Ce qui se transpose ailleurs

Quatre choses, indépendantes de Kairn :

1. **Séparer ce qui est pur de ce qui ne l'est pas**, et y pousser toute la logique intéressante.
   C'est ce qui rend une suite de tests rapide et durable ; tout le reste en découle.
2. **Ne pas confondre « couvert » et « éprouvé ».** Un service tiers n'est jamais couvert par des
   fixtures : la seule preuve est un aller-retour réel, au moins une fois.
3. **Sortir les commandes des chantiers clos.** Un `package.json` est une liste de ce qui se fait
   aujourd'hui ; laisser vivre les commandes mortes, c'est la rendre illisible d'un projet à l'autre.
4. **Écrire les constats comme des règles**, pas comme des étapes. « Deux événements traités
   ensemble laissent toujours le plus récent » se relit dans six mois ; « étape 4 OK » ne dit rien.
