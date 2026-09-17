---
name: Kairn
description: Retenir ce qu'on apprend, une pierre à la fois.
colors:
  papier: "#f2f2ef"
  ombre: "#e4e4df"
  lichen-surface: "#e8eadf"
  roche: "#2a2e2c"
  stone-50: "#f2f2ef"
  stone-100: "#e4e4df"
  stone-300: "#bfc0ba"
  stone-400: "#9aa09b"
  stone-500: "#5e635f"
  stone-700: "#3d4240"
  stone-800: "#2a2e2c"
  stone-900: "#16191a"
  lichen: "#7a8b4f"
  lichen-deep: "#5f6e3b"
  ember: "#b4552f"
  ember-deep: "#9e4526"
  ember-clair: "#d98a63"
  alerte: "#9a3b2c"
  alerte-surface: "#f3e6e2"
  data-mark: "#5f6e3b"
  data-mark-zero: "#cfd0ca"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, calc((100vw - 4rem) / 7.4), 3.75rem)"
    fontWeight: 700
    lineHeight: "0.95"
    letterSpacing: "-0.03em"
  h1-app:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, min(3vw, 4.4vh), 2.5rem)"
    fontWeight: 700
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
  enonce:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, min(2.6vw, 3.2vh), 2rem)"
    fontWeight: 600
  body:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: "1.55"
  small:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.14em"
rounded:
  plein: "0"
  champ: "10px"
  carte: "20px"
  galet: "999px"
spacing:
  pas-1: "0.25rem"
  pas-2: "0.5rem"
  pas-3: "0.75rem"
  pas-4: "1rem"
  pas-6: "1.5rem"
  pas-8: "2rem"
  pas-12: "3rem"
  pas-16: "4rem"
  pas-24: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.stone-900}"
    textColor: "{colors.papier}"
    rounded: "{rounded.galet}"
    padding: "0.75rem 2rem"
  button-primary-hover:
    backgroundColor: "{colors.stone-800}"
  input-trait:
    backgroundColor: "transparent"
    textColor: "{colors.stone-900}"
    rounded: "{rounded.plein}"
  input-trait-focus:
    textColor: "{colors.stone-900}"
  panneau:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.stone-900}"
    rounded: "{rounded.plein}"
    padding: "clamp(2.5rem, 6vh, 6rem) 1rem"
  carte:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.stone-900}"
    rounded: "{rounded.carte}"
    padding: "1.5rem"
---

# Design System: Kairn

## Overview

**Creative North Star: "Le Sentier de Roche"**

Kairn est un sentier de montagne balisé de cairns. Chaque passant ajoute une
pierre, la trace se construit collectivement, sans hâte. Le système visuel
porte cette métaphore : chaque section est une paroi qu'on descend, chaque
marque est délibérée, aucun ornement n'est gratuit. **Ce n'est pas là pour te
séduire, c'est là parce que tu en as besoin. La forme suit la fonction, mais
elle a du grain.**

Le système est **calme, minéral et délibéré**. Quatre surfaces mates
(papier / ombre / lichen / roche) suffisent à séparer les sujets — aucun trait
fin, aucune bordure grise. Une seule audace visuelle est autorisée : le cairn
lui-même, dessiné à la main, aux pierres légèrement irrégulières dérivées d'un
seed déterministe. Toute autre exubérance est proscrite.

**Rejets visuels confirmés (bannis)** :

- Le rendu shadcn par défaut (palette zinc, `rounded-lg` partout, cartes à
  bordure grise fine, ombres portées diffuses).
- Inter comme police principale.
- Les dégradés violet-bleu, les dégradés décoratifs en général.
- Les emojis en icônes.
- Le fond crème avec accent terracotta et display serif à fort contraste (le
  pattern « cabinet d'architecte »).
- Les marqueurs numérotés `01 / 02 / 03` sur du contenu qui n'est pas une
  séquence.
- Les hero avec grand titre centré + illustration abstraite décorative + trois
  cartes-features en dessous.

**Key Characteristics:**

- Palette minérale sur quatre surfaces mates (papier / ombre / lichen / roche).
- Un seul accent chromatique (lichen), un seul accent chaud (ember), chacun
  réservé à un emploi unique.
- Typographie serrée en trois rôles (Bricolage Grotesque display, Satoshi
  texte, Geist Mono données).
- Grain overlay léger sur toutes les surfaces — se sent, ne se voit pas.
- Élément signature : le cairn irrégulier dessiné main, aux pierres
  déterministes.
- Trois radius, trois sens (panneau plein, carte arrondie, galet pilule).

## Colors

Une palette minérale de gris papier à roche sombre, avec un accent lichen
désaturé qui signale et un accent ember réservé à l'affichage du streak.

### Primary (accent unique du produit)

- **Vert Lichen Désaturé** (`--lichen` #7a8b4f) : l'accent unique de l'app.
  N'apparaît que sur le sommet du cairn et sur l'outline de focus. Sa rareté
  est ce qui le rend signal.
- **Lichen Approfondi** (`--lichen-deep` #5f6e3b) : version foncée pour tenir
  4,7:1 de contraste sur le papier. Sert au focus visible et au data-mark des
  graphiques internes.

### Tertiary (streak uniquement)

- **Braise Terracotta** (`--ember` #b4552f) : réservé strictement à
  l'affichage du streak. Aucun autre emploi, jamais.
- **Braise Approfondie** (`--ember-deep` #9e4526) : version foncée.
- **Braise Éclaircie** (`--ember-clair` #d98a63) : version éclaircie pour la
  surface roche (contraste 6,54 sur roche là où l'ember d'origine tombait à
  3,60).

### Neutral (surfaces et encre)

- **Papier Minéral** (`--surface-papier` #f2f2ef, alias `--stone-50`) :
  surface de lecture par défaut.
- **Ombre** (`--surface-ombre` #e4e4df, alias `--stone-100`) : panneau
  alterné, jamais deux d'affilée.
- **Lichen Surface** (`--surface-lichen` #e8eadf) : un seul panneau dans
  toute l'application — celui où le produit tient sa promesse. Interdit tout
  autre usage du lichen sur cet écran, sauf le sommet du cairn.
- **Roche Sombre** (`--surface-roche` #2a2e2c) : deux panneaux maximum. Le
  texte et les pierres s'y inversent en gris clairs ; le sommet lichen reste
  lichen.
- **Encre Granit** (`--stone-900` #16191a) : texte principal sur surfaces
  claires.
- **Gris Lichen** (`--stone-500` #5e635f) : texte secondaire, traits porteurs
  d'information.
- **Gris Feuille** (`--stone-400` #9aa09b) : texte secondaire sur surface
  sombre (tient 6,63 sur roche et 5,16 sur ombre, là où stone-500 tombait à
  2,88).
- **Gris Sol** (`--stone-300` #bfc0ba) : traits légers, indicateurs de fond,
  ascenseur discret.

### Sémantique

- **Alerte** (`--alerte` #9a3b2c) : un échec n'est pas la couleur du produit.
- **Alerte Surface** (`--alerte-surface` #f3e6e2) : fond des messages
  d'alerte.

### Data (graphiques internes uniquement)

- **Data Mark** (`--data-mark` #5f6e3b) : tous les graphiques mesurent une
  grandeur, jamais une catégorie — une seule teinte suffit. C'est le lichen
  approfondi pour tenir 4,7:1 sur le papier.
- **Data Mark Zero** (`--data-mark-zero` #cfd0ca) : amorce grise pour qu'un
  jour sans donnée se lise comme un zéro et non comme un trou dans la série.

### Jetons de code (transparence contextuelle)

- **`--jeton`** (`color-mix(in oklab, #16191a 7%, transparent)`) : fond du
  jeton d'un terme de code cité dans une phrase. Défini en transparence pour
  se poser aussi bien sur papier que sur ombre.
- **`--jeton-clair`** (`color-mix(in oklab, #f2f2ef 12%, transparent)`) :
  version pour la surface roche — encre diluée y serait plus sombre que le
  fond.
- **Un jeton court ne se coupe pas** (≤ 20 signes, seuil mesuré sur la ligne la
  plus étroite du produit). `s-maxage=300` se coupait sur son trait d'union, et
  `box-decoration-break: clone` donnait deux cadres entiers : on lisait deux
  termes là où il y en a un. Le cadre cloné reste pour les longs extraits, où la
  coupure est inévitable et où deux cadres pleins valent mieux qu'un cadre
  fendu.

### Named Rules

**The One Lichen Rule.** Le lichen apparaît uniquement sur le sommet du cairn,
l'outline de focus, et le data-mark des graphiques internes. Nulle part
ailleurs. Sa rareté est ce qui le rend signal — l'exception qui donne du sens.

**The One Ember Rule.** L'ember n'apparaît que sur l'affichage du streak.
Jamais ailleurs, même comme deuxième accent, même « juste pour cette fois ».

**The No-Category-Color Rule.** Les graphiques mesurent des grandeurs, pas des
catégories. Une seule teinte par graphique (`--data-mark`), amorce grise pour
zéro (`--data-mark-zero`). Une palette catégorielle y peindrait des couleurs
qui ne veulent rien dire.

## Typography

**Display Font:** Bricolage Grotesque (fallback ui-sans-serif system-ui).
**Body Font:** Satoshi (fallback ui-sans-serif system-ui).
**Label / Data Font:** Geist Mono.

**Character:** typographie serrée aux titres, ample au texte, discrète aux
données. Le display porte parcimonieusement (titres et grands nombres
uniquement). Le mono est pour les libellés techniques du produit et les termes
de code cités, jamais pour du texte de lecture.

### Hierarchy

- **H1 Site** (Bricolage Grotesque, 700, `clamp(2.25rem, calc((100vw - 4rem) /
7.4), 3.75rem)` mobile puis `clamp(3.5rem, min(7.4vw, 9.6vh), 6.5rem)`
  desktop, leading 0.95, tracking -0.03em) : titres de campagne marketing.
  Deux lignes maximum. Le diviseur 7,4 est mesuré sur la phrase la plus longue
  du hero (« Tu lis beaucoup. »).
- **H1 App** (Bricolage Grotesque, 700, `clamp(1.75rem, min(3vw, 4.4vh),
2.5rem)`) : titres des écrans internes.
- **Énoncé** (Bricolage Grotesque, 600, `clamp(1.375rem, min(2.6vw, 3.2vh),
2rem)`) : énoncé d'une question, un cran sous H1 app, avec mesure élargie.
- **Nombre** (Bricolage Grotesque, 700, `clamp(3.5rem, min(6vw, 9vh),
5.75rem)`) : grands nombres du tableau de bord.
- **H2 Site** (Bricolage Grotesque, 3.75rem desktop / 2.5rem mobile) : titres
  de section marketing secondaires.
- **H2 App** (Bricolage Grotesque, 1.5rem desktop / 1.125rem mobile) : titres
  de bloc dans l'application.
- **Corps** (Satoshi, 400, 1.125rem desktop / 1rem mobile, leading 1.55) :
  texte principal, mesure 65-75 caractères.
- **Petit** (Satoshi, 400, 0.9375rem desktop / 0.875rem mobile) : notes,
  seconds plans, aides contextuelles.
- **Mono** (Geist Mono, 500, 0.8125rem desktop / 0.75rem mobile, letter-spacing
  0.14em) : libellés techniques UPPERCASE, intervalles, compteurs, tags.

### Named Rules

**The Trois-Rôles Rule.** Trois familles typographiques, trois rôles : display
pour titrer, texte pour lire, mono pour signaler du technique. Aucun quatrième
rôle, aucun mélange.

**The Serrage Rule.** Les titres display sont serrés : leading 0.95, tracking
négatif jusqu'à -0.045em. Le titre n'est pas une phrase qui respire, c'est un
bloc qui frappe.

**The Ratio-Pas-Immobilité Rule.** Sur grand écran, tout le bas de l'échelle
monte, mais moins vite que le corps — la hiérarchie tient dans le _rapport_,
pas dans l'immobilité des seconds plans. Treize, quinze, dix-huit sur grand
écran ; douze, quatorze, seize sur mobile.

## Layout

Le layout est vertical par défaut : une pile de panneaux pleine largeur.
Chaque panneau porte sa surface (le fond va d'un bord à l'autre), et son
contenu se centre dans une mesure définie (`texte`, `colonne`, `page`,
`large`). Une strate procédurale — dessinée avec une graine unique — sépare
deux panneaux de surfaces différentes ; jamais deux fois le même dessin.

### Rythme d'espacement

Rythme vertical en pas : `--pas-1` (0.25rem) à `--pas-24` (6rem), plus deux
rythmes qui suivent la fenêtre :

- `--pas-campagne` (clamp 2.5rem–6rem) : rythme marketing, s'ajuste à la
  hauteur de fenêtre pour ne pas déborder du pli.
- `--pas-dedans` (clamp 1.25rem–3rem) : marge intérieure d'un panneau app.
- `--pas-scene` (clamp 2rem–4rem) : écart entre deux temps d'un écran app.

**Aucun pixel arbitraire dans un composant.** Les valeurs en dur (`gap-4`,
`p-6`, etc.) sont interdites ; utiliser les tokens `pas-*`.

### Mesures de contenu

- **texte** (`max-w-2xl`) : lecture longue, ~65 signes.
- **colonne** (`max-w-3xl`) : contenu narratif.
- **page** (`max-w-6xl` puis `max-w-[84rem]` au-delà de 1500px) : mise en page
  standard.
- **large** (`max-w-7xl` puis `max-w-[96rem]` au-delà de 1500px) : tableau de
  bord dense.

### Responsive

Développement mobile-first. Les tailles utilisent `clamp()` sur les axes
hauteur ET largeur (via `min()`) pour ne jamais déborder du pli. Les
composants d'ouverture (hero, panneau essai) mesurent au moins un pli d'écran
(`svh` et non `dvh` — la barre d'adresse mobile qui se replie ne doit pas
faire sauter le contenu). Vérification systématique en largeur mobile (390 px).

### Named Rules

**The Surface-Sépare Rule.** Deux sujets ne sont jamais séparés par une ligne
ni un `<hr>`. C'est le changement de surface qui sépare, via un composant
`<Strates>` qui tire une graine différente à chaque coupe.

**The Pas-Pas-Pixels Rule.** Toute mesure d'espacement passe par un token
`pas-*`. Pas de `gap-4`, pas de `p-[13px]`. Le vocabulaire commun tient parce
que personne n'écrit à côté.

## Elevation & Depth

**Plat avec ombres réservées au cairn.** Aucun composant de l'interface ne
porte d'ombre : la profondeur se joue via les quatre surfaces (papier → ombre
→ lichen → roche, du plus clair au plus foncé) et le grain overlay qui donne
de la matière. **Une seule exception documentée** : les pierres du cairn
peuvent acquérir une ombre légère au sol pour renforcer leur présence
sculptée. Cette ombre-là n'est pas encore implémentée — c'est la direction, à
poser quand le cairn signature entrera en scène en full plein écran.

### Named Rules

**The Flat-Sauf-Cairn Rule.** Aucun composant de l'interface n'a d'ombre — ni
bouton, ni carte, ni dialogue, ni tooltip. La seule ombre autorisée est au sol
des pierres du cairn. Une carte qui aurait « juste besoin d'un léger relief »
est une carte qui devrait poser sur une autre surface.

**The Grain-Se-Sent-Sans-Se-Voir Rule.** Le grain vit derrière le contenu de
chaque panneau, en `mix-blend-mode: multiply` (opacité 0.14) sur les surfaces
claires, en `overlay` (opacité 0.20) sur la roche. Monté jusqu'à ce qu'il se
sente sans jamais toucher la lisibilité du texte.

## Shapes

**Trois radius, trois sens.** L'angle vif ne survit que sur les pleines
largeurs : ailleurs, une interface faite d'angles droits et de traits fins se
lit comme un document, pas comme une application.

- **`--r-plein` (0)** : le panneau, à angle vif — c'est le sol, la paroi,
  pleine largeur.
- **`--r-champ` (10px)** : les jetons de code cités, les champs de saisie qui
  en ont besoin. Un arrondi discret qui dit « c'est un objet interne ».
- **`--r-carte` (20px)** : les cartes qui portent un contenu délimité, les
  composants shadcn (radius-lg / radius-xl y sont remappés). Un arrondi plus
  généreux qui dit « c'est un objet posé ».
- **`--r-galet` (999px)** : les pilules — boutons, badges, tags. C'est la
  forme du geste, arrondie comme un galet poli.

### Named Rules

**The Trois-Formes-Trois-Sens Rule.** Trois radius, trois sens. Panneau = sol
(angle vif). Carte = objet posé (r-carte). Pilule = geste (r-galet). Aucun
autre radius n'est légitime.

## Components

### Panneau

- **Rôle** : unité de composition de toutes les pages. Une bande pleine
  largeur, sa surface va d'un bord à l'autre, son contenu se centre dans une
  mesure définie.
- **Shape** : aucun arrondi (`--r-plein`).
- **Behavior** : le grain vit derrière le contenu. `aere=true` applique
  `--pas-campagne` (rythme marketing), `false` applique `--pas-dedans`
  (rythme app).
- **API** : `<Panneau surface="papier|ombre|lichen|roche" mesure="texte|colonne|page|large" aere centre remplit fond={...} />`
- **Fichier** : `components/coquille/panneau.tsx`.

### Strates

- **Rôle** : jointure entre deux panneaux de surfaces différentes — une coupe
  de roche procédurale.
- **Shape** : dessinée par un algorithme (graine + surfaces), hauteur 32 px
  mobile / 56 px desktop.
- **Behavior** : la coupe se déplace légèrement au scroll (parallaxe subtil) ;
  deux veines dérivent verticalement à vitesses différentes (1.3 et 0.6). Rien
  ne bouge en tâche de fond — le déplacement est celui du regard qui traverse.
- **API** : `<Strates de="papier" vers="ombre" graine="accueil-sentier" />`
- **Fichier** : `components/coquille/strates.tsx`.

### Buttons

- **Shape** : pilule (`--r-galet`, 999px).
- **Primary** : fond `--stone-900`, texte `--stone-50`. Padding
  `0.75rem 2rem`. Hauteur minimum 44 px (cible tactile).
- **Hover** : léger décalage vertical ou variation de teinte (pas d'ombre).
- **Focus** : outline `--lichen-deep` 2 px, offset 2 px.
- **Character** : sobre, ferme, sans ornementation.

### Inputs

- **Style** : **aucun fond, aucune bordure.** Un trait de 2 px sous le champ,
  en `--stone-500`. Le champ s'écrit à même le papier.
- **Focus** : le trait passe en `--lichen-deep`. Pas de changement d'épaisseur
  (le bouton ne doit pas se décaler d'un pixel à chaque entrée).
- **Character** : « un sol, pas une boîte ».

### Cartes (shadcn primitive retokenisée)

- **Shape** : `--r-carte` (20 px).
- **Style** : fond `--surface-papier` ou `--surface-ombre` selon la surface
  environnante, aucune bordure, aucune ombre.
- **Behavior** : l'objet est posé sur la page ; le contraste de surface avec
  le panneau qui l'accueille le distingue.

### Cairn (composant signature)

- **Rôle** : l'élément identitaire unique du produit. Un empilement de pierres
  SVG dessinées à la main, avec formes et rotations légèrement irrégulières
  dérivées de manière déterministe (id d'Atom pour le cairn utilisateur,
  graine pour la landing).
- **Behavior** : sur le tableau de bord, grandit d'une pierre à chaque Atom
  passé en `CONSOLIDATED`. Sur la landing, le `CairnRenversable` répond à un
  geste souris/tactile (chute physique des pierres, `overflow-visible` sur le
  SVG pour laisser les stones sortir).
- **Palette** : stones en `--stone-800` à `--stone-900`, sommet couronné du
  contour `--lichen`.
- **Composants** : `Cairn`, `CairnRenversable`, `PierreSeule`, `PoseDePierre`,
  `ArêtesDePierre`, `SolDuCairn`, `PileEnConstruction`, `SilhouetteDeCairn`
  dans `components/cairn/`.

## Do's and Don'ts

### Do:

- **Do** utiliser une des quatre surfaces (`papier`, `ombre`, `lichen`,
  `roche`) pour poser un panneau. Le fond va d'un bord à l'autre.
- **Do** séparer deux sujets par un changement de surface via `<Strates>`,
  jamais par un `<hr>` ni un filet.
- **Do** utiliser `--lichen` uniquement sur le sommet du cairn, l'outline de
  focus, ou le data-mark des graphiques.
- **Do** utiliser `--ember` uniquement sur l'affichage du streak.
- **Do** dessiner le cairn comme la seule audace visuelle du produit — chaque
  page importante peut en porter trace.
- **Do** utiliser Bricolage Grotesque pour les titres avec parcimonie,
  Satoshi pour le texte, Geist Mono pour les libellés techniques.
- **Do** monter le grain jusqu'à ce qu'il se sente sur les surfaces sans se
  voir sur le texte.
- **Do** utiliser les tokens `pas-*` pour toute mesure d'espacement.
- **Do** écrire les champs de saisie comme un trait sous le texte, sur le
  papier.

### Don't:

- **Don't** utiliser Inter comme police principale (ni aucun système face
  générique).
- **Don't** ajouter des dégradés violet-bleu, ni aucun dégradé décoratif.
- **Don't** utiliser d'emojis en icônes. Les icônes se dessinent en SVG dans
  un style cohérent.
- **Don't** utiliser le rendu shadcn par défaut (palette zinc, `rounded-lg`
  partout, cartes à bordure grise fine, ombres portées diffuses).
- **Don't** utiliser le fond crème avec accent terracotta et display serif à
  fort contraste (pattern « cabinet d'architecte »).
- **Don't** poser des marqueurs `01 / 02 / 03` sur du contenu qui n'est pas
  une séquence.
- **Don't** construire un hero avec grand titre centré + illustration
  abstraite décorative + trois cartes-features en dessous.
- **Don't** enrober un champ de saisie dans une boîte. Un trait sous le champ
  suffit.
- **Don't** ajouter d'ombres à un composant. Seul le cairn en porte au sol.
- **Don't** utiliser `--lichen` ou `--ember` en dehors de leurs emplois
  réservés — même « juste pour cette fois ».
- **Don't** peindre des catégories dans un graphique. Les graphiques mesurent
  des grandeurs (`--data-mark`), pas des types.
- **Don't** écrire de pixels arbitraires dans un composant. Passer par un
  token `pas-*`.
