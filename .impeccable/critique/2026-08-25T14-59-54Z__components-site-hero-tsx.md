---
target: components/site/hero.tsx
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 2
timestamp: 2026-08-25T14-59-54Z
slug: components-site-hero-tsx
---
## Design Health Score

| # | Heuristique | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of system status | 3/4 | L'interaction du cairn (renversable au geste) n'est signalée par rien avant survol. L'affordance signature est cachée. |
| 2 | Match with real world | 4/4 | Vocabulaire calme et incarné ("Ce que tu veux retenir"), métaphore du cairn portée par le SVG. |
| 3 | User control & freedom | 3/4 | "Sans compte, sans email" rassure, mais rien ne dit ce qu'il advient du texte déposé. |
| 4 | Consistency & standards | 3/4 | Le champ "sur un trait" est un beau parti mais s'écarte du standard textarea au point d'être invisible pour un scan rapide. |
| 5 | Error prevention | 3/4 | Compteur au 3/4, borne serveur importée. Soigné. |
| 6 | Recognition over recall | 2/4 | Le hero demande à l'utilisateur de déduire ce que fait le produit à partir d'un textarea vide. Aucun aperçu de découpage. |
| 7 | Flexibility & efficiency | n/a | Persuade. |
| 8 | Aesthetic & minimalist design | 2/4 | Minimaliste, oui — mais plat. Trois zones de poids équivalent (titre / textarea / cairn), rien ne "porte" la page. |
| 9 | Recognition of errors | 3/4 | Bloc `aria-live="polite"` propre, `empty:mt-0` bien réglé. |
| 10 | Help & docs | n/a | Persuade. |

**Total : 23/32 (72%) — Good.** Le point faible est n°8 (poids visuel) et n°6 (reconnaissance) — exactement le feedback du fondateur.

## Design Specificity Verdict

Ce hero pourrait servir tel quel, à trois mots près, à n'importe quel outil "d'apprentissage augmenté par IA" — Notion AI, Recall, Mem, une énième app de flashcards indie. Le seul élément qui empêche le portage direct, c'est le cairn SVG à droite : sans lui, il reste un titre display en deux temps sur fond papier, un textarea sous un trait, un bouton pilule sombre. Pattern archi-vu du micro-SaaS 2024.

La signature Kairn est **présente mais isolée en colonne 2** : elle décore, elle ne compose pas la page. Le titre parle "d'oubli", le cairn parle "d'empilement" — ces deux idées ne se rencontrent nulle part visuellement. Le générique gagne : 60% de la surface (colonne gauche) est indifférenciée.

## Overall Impression

Le hero est **honnête et discipliné**, mais il "ne jette pas" pour une raison précise : la composition est symétrique en poids (1.4fr / 1fr avec `items-center`). Aucune diagonale, aucune tension, aucun élément qui excède son cadre. Le cairn est le seul objet capable d'audace dans tout DESIGN.md, et il est mis **à côté** du titre, sagement centré verticalement dans sa colonne, à `min(84vw, 24rem)` de large. Il est traité comme un compagnon du titre alors qu'il devrait être **le sujet co-titre** de la page. La plus grande opportunité : faire descendre les pierres dans la composition — les laisser dépasser en haut, ou empiéter sur la colonne texte, ou traverser la coupe de roche en bas.

## What's Working

- **Le titre en deux temps.** `Tu lis beaucoup.` → `Tu retiens peu.` avec le stagger de 90ms est la meilleure décision du hero. Le retournement se joue par le motion, pas par la typo. À garder tel quel.
- **Le champ posé sur un trait plutôt qu'en boîte.** Fidèle à "un sol, pas une boîte" et refuse le shadcn par défaut. Décision courageuse, mais elle a un coût (voir P0 box depot).
- **Le cairn qui se renverse au passage.** Idée d'un objet signature interactif non-annoncé — c'est le registre "présence minérale" que DESIGN.md demande. Sous-exploité.

## Priority Issues

### P0 — Le cairn est spectateur, pas sujet
**Why it matters.** DESIGN.md dit "la seule audace visuelle du produit" et "le seul objet qui raconte le produit sans une phrase". Ici il est confiné à une colonne 1fr, centré, avec `justify-center`, hauteur `clamp(18rem, 42vh, 30rem)`. À côté d'un h1 `text-h1-site`, il pèse visuellement autant qu'un pictogramme.
**Fix.** Composition asymétrique : cairn en `h-[clamp(28rem,72vh,44rem)]`, ancré au fond du panneau (`items-end`), débordant de sa colonne vers la gauche pour venir toucher le bloc titre. Retirer `justify-center`. Le cairn doit être **plus haut que le titre** et **plus bas que le titre** — il traverse la hauteur du pli, le titre s'y adosse.
**Suggested command.** `layout` puis `overdrive`.

### P0 — La "box depot" est un formulaire, pas une invitation
**Why it matters.** C'est **la promesse du produit** ("le découpage convainc, le promettre fait fermer l'onglet" — commentaire du code lui-même). Or il ressemble à un textarea de formulaire de contact : label mono UPPERCASE + trait 2px + placeholder gris. Rien ne suggère qu'un mécanisme puissant se déclenche derrière.
**Fix.** Trois leviers :
1. **Pré-remplir un exemple ghosted** (grisé, effaçable au focus) — un vrai bout de doc/article, pas un placeholder générique. Voir un dépôt possible avant d'écrire.
2. **Faire monter une pierre pendant l'attente** — entre le clic et le résultat, 5-20s de vide. Poser une pierre supplémentaire sur le cairn pendant `enCours` relie le champ au cairn.
3. **Retirer ou rétrograder le label mono UPPERCASE**. Il alourdit visuellement plus qu'il ne guide.

**Suggested command.** `bolder` sur la box, `animate` pour lier au cairn.

### P1 — Aucune tension dans la première seconde
**Why it matters.** Au chargement, tout arrive en 250ms + stagger 90ms uniforme. Aucun élément ne se distingue par son entrée. Sur une landing, le premier regard cherche le point saillant — il n'y en a pas.
**Fix.** Casser la symétrie du motion. Le cairn arrive **différemment** : pierres qui se posent une par une, la dernière (couronnée `--lichen`) tombe **de plus haut** et se pose **après** que le titre soit stable. Décaler la pose du cairn de +400ms via `attente` de `Apparition`.
**Suggested command.** `animate`.

### P1 — Le titre et le cairn ne se parlent pas
**Why it matters.** "Tu lis beaucoup. Tu retiens peu." dit **la perte**. Le cairn dit **la construction**. Deux idées opposées, côte à côte, sans passerelle visuelle. Le hero raconte deux histoires parallèles.
**Fix.** Deux options exclusives :
1. **Faire chuter une pierre du cairn** au chargement, en rappel de "tu retiens peu" — la pierre part et se pose au sol.
2. Plus doux : le titre `Tu retiens peu.` s'aligne verticalement sur la pierre couronnée du cairn. Ligne invisible entre phrase-retournement et pierre-lichen.

**Suggested command.** `layout`.

### P2 — Le CTA est un bouton pilule shadcn standard
**Why it matters.** "Voir ce que ça donne" est le seul point noir de la page. Il ne dialogue avec rien du reste. Le libellé est bon, la forme est banale.
**Fix.** Garder le fond `--stone-900`, mais lui donner une arête vive côté droit (biseau minéral ou clip-path irrégulière côté droit) qui rappelle la géométrie des pierres. Ou passer le hover en `--lichen` background.
**Suggested command.** `polish`.

### P2 — La colonne texte force trop de décisions simultanées
**Why it matters.** À l'arrivée, l'œil doit choisir entre : titre, sous-titre (2 lignes), label, champ, bouton, mention "Sans compte", "Déjà un compte ? Se connecter". **Sept sollicitations** dans une seule colonne serrée.
**Fix.** Retirer le sous-titre ou le fusionner avec le titre. Le titre porte déjà tout le poids ; le résultat de l'essai expliquera le mécanisme de manière incarnée.
**Suggested command.** `distill`.

## Persona Red Flags

**Jordan (first-timer, 30s).** Voit "Tu lis beaucoup. Tu retiens peu." → OK. Voit un tas de pierres → joli. Arrive au champ → "Ce que tu veux retenir" → hésite : *je dois écrire quoi ? Un mot ? Un article ?* **Red flag** : aucun exemple concret, il ferme.

**Riley (stress tester, dev senior, 20s).** Scanne. Voit trois zones de poids égal. Pense : "Landing générique, textarea + tas de pierres décoratif". Ne survole pas le cairn, ne découvre pas l'interaction. **Red flag** : la signature est cachée derrière un geste. Il part avec l'impression d'un énième "Notion pour la mémoire".

**Casey (mobile, 390px).** Ordre DOM sur mobile : bloc texte d'abord, cairn ensuite. Le cairn arrive en **7e position, sous le pli**. **Red flag critique** : sur mobile, Kairn ressemble à un formulaire de contact avec une illustration décorative en bas.

**Le développeur curieux mais expéditif (persona projet, 45s).** Lit le titre — bien. Sous-titre — long. Trouve le champ mais ça ressemble à un search box. Se demande si c'est vraiment le produit ou un teaser. Cherche une preuve de découpage, une capture. Ne trouve pas. Regarde le cairn — joli mais ne comprend pas le lien. **Red flag** : le hero n'a pas de preuve avant clic.

## Cognitive Load

- **Chunking.** Deux colonnes visuellement indépendantes, aucun lien. Charge : moyenne.
- **Visual hierarchy.** Trois poids équivalents. Pas de dominante. Charge : **élevée**.
- **One thing at a time.** Non. 7 sollicitations côté gauche.

Retirer le sous-titre + fusionner label+placeholder ramènerait à 4 sollicitations, respirable.

## Minor Observations

- "Se connecter" apparaît **deux fois** au-dessus du pli (header + sous le champ). Redondant.
- Le `--pas-campagne` du panneau fait "flotter" tout le contenu au milieu — envisager un ancrage haut sur le bloc titre.
- Focus textarea passe en `--lichen` : bien pensé. Le rendre visible plus longtemps (trace 300ms post-blur) créerait un lien avec la pierre couronnée.
- Sur `md`, la boîte cairn est en `w-full` d'une colonne 1fr — soit ~300px sur un laptop 1440px. Petit pour "la seule audace visuelle".
- `aspect-[100/93]` sur mobile puis `aspect-auto` sur md : bien pensé mais insuffisant pour donner de la présence.

## Questions to Consider

1. **Le hero doit-il montrer un exemple de découpage déjà fait avant que l'utilisateur écrive quoi que ce soit ?** Un Input ghosted à gauche, 3 Atoms extraits à droite, statiquement — changerait la conversion. Est-ce que ça affaiblit l'essai en révélant sa magie trop tôt ?

2. **Le cairn est-il un compagnon du titre ou l'inverse ?** Si on inverse (cairn 1.4fr, texte 1fr), qui porte alors la page ? Kairn assume-t-il de faire porter la promesse par une illustration animée plutôt que par une phrase ?

3. **La chute des pierres au geste — easter egg ou démonstration du produit ?** Renverser un empilement = perdre ce qu'on a retenu. C'est une métaphore violente et précise. Elle mérite d'être signalée (mention "essaie de le faire tomber") — sinon personne ne la découvre.
