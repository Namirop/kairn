---
name: Kairn
description: Retenir ce qu'on apprend, une pierre à la fois.
colors:
  papier: "#eef5f7"
  ombre: "#cfe3ec"
  givre: "#e4eff2"
  session: "#b3cfda"
  roche: "#1e2b3c"
  stone-50: "#f4f9fb"
  stone-100: "#dcebf0"
  stone-300: "#7fb3c8"
  stone-400: "#8fb2c4"
  stone-500: "#345770"
  stone-700: "#1f4360"
  stone-800: "#143049"
  stone-900: "#0d2236"
  accent: "#1b4fc4"
  accent-profond: "#143b8d"
  accent-clair: "#86b7f0"
  lichen: "#9fc22e"
  lichen-deep: "#5c7418"
  ember: "#b4552f"
  ember-deep: "#9e4526"
  ember-clair: "#d98a63"
  alerte: "#9a3b2c"
  alerte-surface: "#f3e6e2"
  data-mark: "#143b8d"
  data-mark-zero: "#c3d7e1"
  ciel-haut: "#163f96"
  ciel-milieu: "#1a4aa6"
  ciel-bas: "#1e5cc4"
  ciel-horizon: "#3a86c9"
  ciel-teinte: "#a5d8e7"
  terre: "#47a2cb"
  pierre-loin-1: "#b3d4e1"
  pierre-loin-2: "#c2dde8"
  pierre-loin-3: "#cfe6ee"
  pierre-proche-1: "#1b3d58"
  pierre-proche-2: "#24506f"
  pierre-proche-3: "#2e6285"
  geste-ciel: "#14202e"
  ombre-du-cairn: "#0b1c2c"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, calc((100vw - 4rem) / 7.4), 3.75rem)"
    fontWeight: 700
    lineHeight: "0.95"
    letterSpacing: "-0.03em"
  h1-app:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, min(3vw, 4.4vh), 2.5rem)"
    fontWeight: 700
    lineHeight: "1.25"
  enonce:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, min(2.6vw, 3.2vh), 2rem)"
    fontWeight: 700
    lineHeight: "1.25"
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
    fontWeight: 400
    letterSpacing: "0.14em"
rounded:
  plein: "0"
  pierre: "6px"
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
    textColor: "{colors.stone-50}"
    rounded: "{rounded.galet}"
    padding: "0 1.5rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "{colors.stone-800}"
  input-trait:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.stone-900}"
    rounded: "{rounded.champ}"
    height: "2.75rem"
  input-trait-focus:
    textColor: "{colors.stone-900}"
  panneau:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.stone-900}"
    rounded: "{rounded.plein}"
    padding: "1.5rem"
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

Le système est **calme, minéral et délibéré**. Cinq surfaces mates
(papier / ombre / givre / session / roche) suffisent à séparer les sujets — aucun trait
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

- Palette minérale sur cinq surfaces mates (papier / ombre / givre / session /
  roche).
- Deux accents froids qui ne se confondent pas (l'accent pour ce que le
  produit demande, le lichen pour la maîtrise) et un accent chaud (ember),
  chacun réservé à son emploi.
- Typographie serrée en trois rôles (Bricolage Grotesque display, Satoshi
  texte, Geist Mono données).
- Grain overlay léger sur toutes les surfaces — se sent, ne se voit pas.
- Élément signature : le cairn irrégulier dessiné main, aux pierres
  déterministes.
- Trois radius, trois sens (panneau plein, carte arrondie, galet pilule).

## Colors

Une palette minérale bleu glacier, du papier à la roche bleu de nuit, avec un
accent qui porte ce que le produit demande, un lichen qui ne dit que la
maîtrise et un ember réservé à l'affichage du streak. Les valeurs vivent dans
`app/styles/tokens/couleurs.css` (et `paysage.css` pour l'ouverture) ; aucun
composant ne les écrit en dur.

### Primary (ce que le produit demande)

- **Accent** (`--accent` #1b4fc4) : tout ce que le produit demande — focus,
  choix retenu, interrupteur, trait du compteur du jour.
- **Accent Profond** (`--accent-profond` #143b8d) : l'anneau de focus et le
  trait de focus des champs sur les surfaces claires (9,33:1 sur le papier).
- **Accent Clair** (`--accent-clair` #86b7f0) : la variante des surfaces
  sombres, où l'accent du papier passe sous le seuil de l'anneau de focus
  (6,85:1 sur la roche, contre 1,39 pour `--accent-profond`).

### Secondary (la maîtrise, et elle seule)

- **Lichen** (`--lichen` #9fc22e) : sommet du cairn, pierre tenue, bonne
  réponse. Saturé pour se poser sur des pierres sombres (6,98:1 sur la roche).
- **Lichen Approfondi** (`--lichen-deep` #5c7418) : le lichen des surfaces
  claires, où le lichen saturé tombe à 1,86:1 ; celui-ci tient 4,80:1 sur le
  papier.

### Tertiary (streak uniquement)

- **Braise Terracotta** (`--ember` #b4552f) : réservé strictement à
  l'affichage du streak. Aucun autre emploi, jamais.
- **Braise Approfondie** (`--ember-deep` #9e4526) : version foncée.
- **Braise Éclaircie** (`--ember-clair` #d98a63) : l'ember des surfaces
  sombres (5,30:1 sur la roche, là où l'ember du papier tombe à 2,92).

### Neutral (surfaces et encre)

- **Papier** (`--surface-papier` #eef5f7) : surface de lecture par défaut.
- **Ombre** (`--surface-ombre` #cfe3ec) : panneau alterné, jamais deux
  d'affilée. Papier contre ombre : 1,20 pour 1, volontairement faible.
- **Givre** (`--surface-givre` #e4eff2) : un seul panneau dans
  toute l'application — celui où le produit tient sa promesse. Interdit tout
  autre usage du lichen sur cet écran, sauf le sommet du cairn.
- **Session** (`--surface-session` #b3cfda) : le sol de l'écran de session, et
  d'aucun autre. La carte de la question, en papier, s'y pose à 1,48 pour 1.
- **Roche** (`--surface-roche` #1e2b3c) : deux panneaux maximum. Le
  texte et les pierres s'y inversent en clairs ; le sommet lichen reste
  lichen.
- **Encre de Nuit** (`--stone-900` #0d2236) : texte principal sur surfaces
  claires (14,65:1 sur le papier).
- **Pierre 800** (`--stone-800` #143049) : survol du bouton principal.
- **Pierre 700** (`--stone-700` #1f4360) : objet posé sur la roche, texte
  second sur le sol de la session.
- **Pierre 500** (`--stone-500` #345770) : texte secondaire, le plus répandu
  de l'interface ; réglé pour tenir AA sur l'ombre (5,78:1) et sur le sol de la
  session, pas seulement sur le papier.
- **Pierre 400** (`--stone-400` #8fb2c4) : texte secondaire sur surface
  sombre (6,37:1 sur la roche, là où stone-500 tombe à 1,87).
- **Pierre 300** (`--stone-300` #7fb3c8) : les filets, réglés pour se voir
  aussi sur le sol de la session ; texte second des panneaux de roche (6,26:1) ;
  ascenseur discret.
- **Pierre 100** (`--stone-100` #dcebf0) et **Pierre 50** (`--stone-50`
  #f4f9fb) : les pierres claires du cairn sur la roche ; `--stone-50` est
  l'encre des surfaces sombres.

### Sémantique

- **Alerte** (`--alerte` #9a3b2c) : un échec n'est pas la couleur du produit.
- **Alerte Surface** (`--alerte-surface` #f3e6e2) : fond des messages
  d'alerte.

### Data (graphiques internes uniquement)

- **Data Mark** (`--data-mark` #143b8d) : tous les graphiques mesurent une
  grandeur, jamais une catégorie — une seule teinte suffit. C'est l'accent
  approfondi, parce qu'une barre fine demande plus de contraste qu'un aplat.
- **Data Mark Zero** (`--data-mark-zero` #c3d7e1) : amorce pour qu'un
  jour sans donnée se lise comme un zéro et non comme un trou dans la série.

### Paysage (ouverture uniquement)

Le ciel de l'ouverture est un lavis d'une seule teinte (`--ciel`, de
#163f96 à #3a86c9 en passant par #1a4aa6 et #1e5cc4), sous l'ombre du versant
(`--ombre-du-versant`) — un ciel, pas un dégradé décoratif. Autour de lui :
`--ciel-teinte` #a5d8e7 (la brume vers laquelle virent les lointains),
`--terre` #47a2cb (le sol du premier plan), les pierres lointaines
`--pierre-loin-1` #b3d4e1, `--pierre-loin-2` #c2dde8, `--pierre-loin-3`
#cfe6ee, les pierres proches `--pierre-proche-1` #1b3d58,
`--pierre-proche-2` #24506f, `--pierre-proche-3` #2e6285, le geste
`--geste-ciel` #14202e et l'ombre au sol du cairn `--ombre-du-cairn` #0b1c2c.

### Jetons de code (transparence contextuelle)

- **`--jeton`** (`color-mix(in oklab, var(--stone-900) 7%, transparent)`) et
  **`--jeton-bord`** (même mélange à 14 %) : fond et bord du
  jeton d'un terme de code cité dans une phrase. Définis en transparence pour
  se poser aussi bien sur papier que sur ombre.
- **`--jeton-clair`** (`color-mix(in oklab, var(--stone-50) 12%, transparent)`)
  et **`--jeton-bord-clair`** (même mélange à 22 %) :
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

Les tailles sont des jetons (`--t-*`) : `app/styles/tokens/echelle.css` pour
le mobile, `grand-ecran.css` à partir de `md` (48rem), `paysage.css` pour le
titre de l'ouverture. Les polices sont chargées dans `app/polices.ts`.

- **Ouverture** (Bricolage Grotesque, 700, `--t-ouverture` :
  `clamp(2.25rem, calc((100vw - 4rem) / 7.4), 3.75rem)` mobile, leading 0.95,
  tracking -0.03em ; à partir de `md`,
  `clamp(3.5rem, min(13.5vh, calc((min(80rem, 100vw - 4rem) - 3rem) * 0.084)), 8rem)`,
  leading 0.84, tracking -0.045em, la mesure passant à 96rem à partir de 96rem
  de large) : le titre de la landing. Deux lignes maximum. Le diviseur 7,4 est
  mesuré sur la phrase la plus longue du hero (« Tu lis beaucoup. »).
- **H1 Site** (Bricolage Grotesque, 700, `--t-h1-site` :
  `clamp(2.25rem, calc((100vw - 5rem) / 7.4), 3.75rem)` mobile puis
  `clamp(3.5rem, min(7.4vw, 9.6vh), 6.5rem)` desktop, leading 1, tracking
  -0.02em) : titres des autres pages marketing (tarifs).
- **H2 Site** (Bricolage Grotesque, 700, 3.75rem desktop / 3.5rem mobile,
  leading 1, tracking -0.02em) : titres de section marketing.
- **H1 App** (Satoshi, 700, `clamp(1.75rem, min(3vw, 4.4vh), 2.5rem)` desktop
  / 1.625rem mobile, leading 1.25) : titres des écrans internes. L'écran
  d'erreur et la fenêtre de l'essai le prennent en Bricolage Grotesque.
- **Énoncé** (Satoshi, 700, `clamp(1.375rem, min(2.6vw, 3.2vh), 2rem)`
  desktop / 1.5rem mobile, leading 1.25) : énoncé d'une question, un cran sous
  H1 app, pour qu'une question de quinze mots tienne sur deux lignes.
- **Nombre** (Bricolage Grotesque, 500, `clamp(3.5rem, min(6vw, 9vh),
5.75rem)` desktop / 3.5rem mobile) : grands nombres du tableau de bord et des
  offres.
- **Compteur** (Bricolage Grotesque, 700, `clamp(4.5rem, min(10vw, 16vh),
10.5rem)` desktop / 4.5rem mobile, leading 0.8) : le compteur du jour, et lui
  seul — le titre de son écran.
- **H2 App** (Satoshi, 600 à 700, 1.5rem desktop / 1.125rem mobile) : titres
  de bloc dans l'application.
- **Corps** (Satoshi, 400, 1.125rem desktop / 1rem mobile, leading 1.55) :
  texte principal, mesure 65-75 caractères.
- **Petit** (Satoshi, 400, 0.9375rem desktop / 0.875rem mobile) : notes,
  seconds plans, aides contextuelles.
- **Mono** (Geist Mono, 400, 0.8125rem desktop / 0.75rem mobile, letter-spacing
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

Rythme vertical en pas : `--pas-1` (0.25rem), `--pas-2` (0.5rem), `--pas-3`
(0.75rem), `--pas-4` (1rem), `--pas-6` (1.5rem), `--pas-8` (2rem), `--pas-12`
(3rem), `--pas-16` (4rem), `--pas-24` (6rem), plus trois rythmes fixes sur
mobile qui suivent la hauteur de fenêtre à partir de `md` :

- `--pas-campagne` (4rem mobile, `clamp(2.5rem, 6vh, 6rem)` desktop) : rythme
  marketing, s'ajuste à la hauteur de fenêtre pour ne pas déborder du pli.
- `--pas-dedans` (1.5rem mobile, `clamp(1.25rem, 3.6vh, 3rem)` desktop) :
  marge intérieure d'un panneau app, et ce qui sépare un contenu du bord de ce
  qui le porte.
- `--pas-scene` (3rem mobile, `clamp(2rem, 5vh, 4rem)` desktop) : écart entre
  deux temps d'un écran app (question, réponse, gestes).

`--barre-basse` (`calc(3.5rem + var(--pas-2) * 2 + env(safe-area-inset-bottom))`)
est la hauteur de la navigation basse du téléphone, pour ce qui doit se poser
au-dessus d'elle.

**Aucun pixel arbitraire dans un composant.** Les valeurs en dur (`gap-4`,
`p-6`, etc.) sont interdites ; utiliser les tokens `pas-*`.

### Mesures de contenu

- **texte** (`max-w-2xl`) : lecture longue, ~65 signes.
- **colonne** (`max-w-3xl`) : contenu narratif.
- **page** (`max-w-6xl` puis `max-w-[84rem]` à partir de `2xl`, 96rem) : mise
  en page standard.
- **large** (`max-w-7xl` puis `max-w-[96rem]` à partir de `2xl`, 96rem) :
  tableau de bord dense.

Le contenu d'un panneau garde une gouttière de `--pas-6` sur mobile, `--pas-8`
à partir de `md`.

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
porte d'ombre : la profondeur se joue via les cinq surfaces (papier → givre
→ ombre → session → roche, du plus clair au plus foncé) et le grain overlay qui
donne de la matière. Sur les surfaces claires, un objet posé change de cran
(`--surface-ombre` sur du papier, `--surface-papier` sur l'ombre, le givre et
la session — table `SURFACES` de `components/coquille/surfaces.ts`) ; sur la
roche, il **monte** (`--stone-700` #1f4360), parce qu'un objet posé y capte la
lumière au lieu de creuser. `--stone-800` (#143049) ne peut pas servir d'objet
sur la roche : plus sombre qu'elle (#1e2b3c), il la creuserait. **Une seule
exception documentée** : les pierres du cairn portent une ombre légère au sol.
Elle est posée sous le `CairnRenversable` de l'ouverture
(`components/site/ouverture.tsx`) : une ellipse floutée en `--ombre-du-cairn`
(#0b1c2c) à l'opacité `--ombre-du-cairn-part` (0.3), passée par des variables
pour rester visible sur un sol coloré.

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
- **`--r-pierre` (6px)** : une cible désignée dans une liste, haute de
  plusieurs lignes (les choix d'une question fermée) : le galet en ferait une
  gélule qui mange un mot, le champ l'arrondirait trop.
- **`--r-champ` (10px)** : les jetons de code cités, les champs de saisie, les
  blocs internes des réglages ; c'est aussi le `--radius` de shadcn, et
  radius-xs / radius-sm / radius-md y sont remappés. Un arrondi discret qui dit
  « c'est un objet interne ».
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
  (rythme app). Le panneau déclare sa surface par `data-surface`, dont dépend
  la couleur de l'anneau de focus. `ciel` lui fait porter le ciel de
  l'ouverture au lieu de sa surface.
- **API** : `<Panneau id surface="papier|ombre|givre|session|roche" mesure="texte|colonne|page|large" aere centre remplit ciel fond={...} />`
- **Fichier** : `components/coquille/panneau.tsx`.

### Strates

- **Rôle** : jointure entre deux panneaux de surfaces différentes — une coupe
  de roche procédurale.
- **Shape** : dessinée par un algorithme (graine + surfaces), hauteur 32 px
  mobile / 56 px desktop.
- **Behavior** : la coupe reste fixe (la décaler découvrirait une couture
  d'un pixel) ; deux veines, mêlées à `--stone-500` par `color-mix`, dérivent
  verticalement au scroll à vitesses différentes (1.3 et 0.6). Rien ne bouge
  en tâche de fond — le déplacement est celui du regard qui traverse, et il
  s'arrête sous `prefers-reduced-motion`.
- **API** : `<Strates de="papier" vers="ombre" graine="accueil-sentier" />`
- **Fichier** : `components/coquille/strates.tsx`.

### Buttons

- **Shape** : pilule (`--r-galet`, 999px).
- **Primary** : fond `--stone-900`, texte `--stone-50`. Taille `default` :
  hauteur 40 px (`h-10`), padding horizontal `--pas-6`, texte `petit`. Taille
  `lg` : hauteur 44 px (`h-11`), padding `--pas-8`, texte `corps` — calée sur
  la cible tactile de l'action principale.
- **Hover** : variation de teinte (`--stone-800`) ; à l'appui, un décalage
  vertical d'un pixel. Pas d'ombre.
- **Sur la roche** : variantes `clair` (fond `--stone-50`, texte
  `--stone-900`), `outlineClair` et `linkClair`, où un bouton plein
  `--stone-900` disparaîtrait dans le fond.
- **Focus** : outline globale `--accent-profond` 2 px, offset 2 px
  (`app/styles/base.css`) — et `--accent-clair` sur les surfaces de roche, où
  la première tombe à 1,39:1, sous le seuil d'un indicateur de focus (6,85:1
  pour la seconde). Le crochet est `[data-surface="roche"]`, posé par
  `Panneau` et par la fenêtre de l'essai.
- **Fichier** : `components/ui/button.tsx`.
- **Character** : sobre, ferme, sans ornementation.

### Inputs

- **Style** : **aucune bordure, aucun contour.** Un trait de 2 px sous le
  champ, visible au repos. Le champ s'écrit à même la surface.
- **Focus** : sur le creux de l'essai, le trait passe de `--stone-300` à
  `--accent-profond`. Pas de changement d'épaisseur (le bouton ne doit pas se
  décaler d'un pixel à chaque entrée). Le changement mesure 4,50:1 contre
  l'état de repos — au-dessus du seuil exigé d'un indicateur de focus. Les
  champs de l'application gardent l'anneau de focus global.
- **Le creux, et lui seul** : un champ de **conversion** — celui de l'essai
  public, où personne ne sait encore ce qu'on attend de lui — est creusé dans
  sa surface (`--surface-ombre` dans du papier, `--r-champ` sur les seuls
  angles du haut, le trait de 2 px au bas du creux — sur un angle arrondi, il
  s'interromprait au début de la courbe ; `components/site/champ-de-depot.tsx`). C'est un **creux, pas un contour** : un contour fait une boîte posée
  sur la page, un creux est du terrain, et on dépose dans un creux. La règle du
  sol survit intacte. Dans l'application, l'utilisateur sait déjà où il est :
  le champ y reste nu — registre marketing contre registre interne.
- **Texte d'invite** : `--stone-500` au minimum. `--stone-400` ne donne que
  1,70:1 sur le creux, et c'est la seule phrase qui dise quoi mettre dans le
  champ.
- **Character** : « un sol, pas une boîte » — creusé là où il faut le montrer.

### Cartes (une forme, pas un composant)

- **Rôle** : il n'y a plus de composant `Card`. Une carte est un bloc qui
  porte la classe `rounded-carte` et un fond de surface, posés directement à l'endroit où elle sert : la carte de la
  question (`components/revision/carte-question.tsx`), le bloc de réponse sur
  la roche, la fin de session, les offres, la boîte d'authentification, le
  dialogue (`components/ui/dialog.tsx`), les blocs de code, les concepts de
  l'essai, les dépôts listés, les destinations du rail et de la barre basse.
- **Shape** : `--r-carte` (20 px). C'est aussi la valeur de radius-lg et
  radius-xl, pour les primitives shadcn.
- **Style** : le fond suit en général la surface « objet » de la table
  `SURFACES` — `--surface-ombre` sur le papier, `--surface-papier` sur
  l'ombre, le givre et la session, `--stone-700` sur la roche ; le bloc de
  réponse et les blocs de code prennent `--surface-roche`. Aucune ombre. Les
  cartes de l'écran d'administration (`components/administration/`) portent en
  plus une bordure `--stone-300`.
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
- **Palette** : sur surface claire, pierres en `--stone-700`, `--stone-800`
  et `--stone-900` ; sur la roche, en `--stone-50`, `--stone-100` et
  `--stone-300`. La dernière pierre posée porte une arête `--lichen`. Une
  pierre à venir n'est qu'un contour pointillé (`--stone-300`, ou
  `--stone-500` sur la roche).
- **Composants** : `Cairn`, `CairnRenversable`, `PierreSeule`, `PierrePosee`,
  `PierreAVenir`, `PoseDePierre`, `ArêtesDePierre`, `SolDuCairn`,
  `PileEnConstruction`, `PriseDuCairn`, `SilhouetteDeCairn` dans
  `components/cairn/`.

## Do's and Don'ts

### Do:

- **Do** utiliser une des cinq surfaces (`papier`, `ombre`, `givre`,
  `session`, `roche`) pour poser un panneau. Le fond va d'un bord à l'autre.
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
- **Don't** enrober un champ de saisie dans une boîte à contour. Un trait sous
  le champ suffit dans l'application ; sur un champ de conversion, c'est un
  creux de surface qui le signale, jamais une bordure.
- **Don't** ajouter d'ombres à un composant. Seul le cairn en porte au sol.
- **Don't** utiliser `--lichen` ou `--ember` en dehors de leurs emplois
  réservés — même « juste pour cette fois ».
- **Don't** peindre des catégories dans un graphique. Les graphiques mesurent
  des grandeurs (`--data-mark`), pas des types.
- **Don't** écrire de pixels arbitraires dans un composant. Passer par un
  token `pas-*`.
