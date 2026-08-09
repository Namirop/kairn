---
name: anti-ai-design-patterns
description: Patterns de design générés par IA à éviter, et les réflexes de designer pour les corriger (structure, typographie, espacement, couleur, décoration, formulaires, données). Consulte ce skill DÈS QUE tu crées, modifies ou revois une interface web — écran, composant, landing, dashboard, formulaire, refonte — même si la demande ne dit pas explicitement "design". Ne traite jamais le design comme une tâche faisable seul : la pente par défaut d'une IA est le générique, et c'est précisément ce qu'on corrige ici. Utile aussi pour cadrer typo/palette/structure en début de projet, auditer un écran qui "sent l'IA", ou relire du frontend généré avant de le considérer terminé.
---

# Anti-AI Design Patterns

Boîte à réflexes pour produire une UI qui ne "sent pas l'IA". Pas un cours de théorie : pour chaque problème, le symptôme, le geste de correction d'un designer, et un exemple.

## Principe n°1 — Aucun élément n'est interdit

**Le tell IA, ce n'est pas l'élément, c'est son usage par défaut, uniforme et décoratif.**

Cards, pills, kickers, icônes, gradients, centrage, surfaces chaudes : tous légitimes. Ce qui crie « généré par IA », c'est de les coller mécaniquement, partout, sans fonction. Le geste de correction est **toujours le même** : rendre l'usage fonctionnel et intentionnel — pas bannir l'élément.

Conséquence directe : ne te contente jamais de *retirer* (tu laisses des trous). Tu **remplaces** par l'option qui sert vraiment le contenu.

## Comment utiliser ce skill

1. Identifie le domaine concerné par la tâche et lis le `references/` correspondant (table plus bas). Plusieurs peuvent s'appliquer.
2. Avant de considérer un écran « terminé », passe la **checklist de fin d'écran** (plus bas).
3. Garde en tête : les valeurs chiffrées du skill (px, ratios, comptes) sont des **ordres de grandeur à calibrer**, jamais des absolus à copier. Le *rapport* entre les valeurs compte plus que les valeurs.

**Quand tu rapportes un audit ou une explication design** : sois scannable, jamais un pavé. Priorise — 🔴 casse le rendu / 🟡 à améliorer / 🟢 détail. Donne le problème + le fix, pas la théorie.

## Principes directeurs

Ces principes gouvernent tout le reste. Les `references/` ne sont que leur application concrète.

1. **Aucun élément n'est interdit** — voir principe n°1 ci-dessus.
2. **Contenu avant container** — Liste les infos/actions réelles *avant* de créer un composant. Un container (card, section, panel) qui habille moins de ~4-5 infos utiles ne devrait pas exister sous cette forme. La forme suit le contenu, jamais l'inverse.
3. **Le titre porte le design** — Si un écran « manque de quelque chose », grossis d'abord le titre principal. N'ajoute pas un gradient, une icône ou un glow pour compenser un titre sous-dimensionné.
4. **L'accent signale, il ne décore pas** — La couleur brand est rare et fonctionnelle (CTA primaire, prix, statut critique, identité sur 1-2 éléments). Pas de couleur brand obligatoire : le quasi-monochrome est une option premium valide, pas un manque.
5. **Proximité = sens** — Proche = même groupe, espacé = groupes différents. La hiérarchie naît du **contraste** d'espacement, pas de valeurs uniformes. Le défaut IA est l'espacement uniforme partout.
6. **Registre marketing vs interne** *(principe transversal majeur)* — Le degré d'expressivité dépend du contexte. **Marketing / public / conversion** : expressif autorisé (police display, gros titres, surface chaude, accent, élément signature). **Interne / utilitaire / admin** : sobre (body en bold, titres mesurés, neutre, espacements compressés). Beaucoup de décisions découlent directement de cet axe.
7. **Un élément signature (produits publics seulement)** — Sur un produit public, **choisis et adapte** UN pattern visuel propre au métier, placé sur l'écran le plus vu. Pas dix, pas sur chaque page. Sur de l'interne/utilitaire : saute, ce serait du bruit. Choisir/adapter dans un menu d'exemples (voir `references/structure.md`), pas inventer à froid.
8. **Audit seulement avant un changement systémique** — Toucher une couleur / police / token d'espacement utilisé à *plein d'endroits* → audit complet + catégorisation + passes successives (voir `references/couleur.md`). Un fix **local** (un écran, un composant) se corrige directement, sans audit ni cérémonie.
9. **S'inspirer hors du mainstream** — Ne pas se limiter à Linear/Vercel/Stripe/Notion (ce sont devenus les références « IA »). Voir l'appendice références dans `references/structure.md`.

## Références par domaine

| Domaine | Fichier | Lire quand |
| --- | --- | --- |
| Structure & composition | `references/structure.md` | grilles de cards, centrage, layouts en colonnes, élément signature métier |
| Typographie | `references/typographie.md` | choix de police, tailles de titres, display vs body, chiffres |
| Espacement | `references/espacement.md` | rythme vertical, proximité, padding, line-height |
| Couleur & accent | `references/couleur.md` | usage de la couleur brand, états sémantiques, neutres, audit couleur |
| Décoration | `references/decoration.md` | icônes, pills/tags, kickers, mockups, glow/gradients/effets « premium » |
| Formulaires | `references/formulaires.md` | tout form ; champs, labels, boutons, validation/erreurs |
| Données | `references/donnees.md` | stats, tableaux, empty states, formatage des nombres |
| Mobile (app native) | `references/mobile.md` | toute app native ; zones d'atteinte, cibles tactiles, safe areas, sheets, densité, motion, haptique |

## Checklist de fin d'écran

Rapide (~5 min). Passer avant de considérer un écran « terminé ». Les seuils sont indicatifs et à calibrer au contexte (marketing vs interne).

**Structure**
- [ ] Pas de grille de N cards uniformes (icône-titre-texte) là où le contenu ne le justifie pas ?
- [ ] Aucun container qui habille moins de ~4-5 infos utiles ?
- [ ] Alignement décidé (pas tout centré par défaut), cohérent par groupe ?

**Typographie**
- [ ] Titres assez grands pour porter le design (calibré marketing vs interne) ?
- [ ] Police display réservée au marketing ; en interne, body en bold/semibold ?
- [ ] `tabular-nums` sur les chiffres qui s'alignent ou changent ?

**Espacement**
- [ ] Éléments liés rapprochés, groupes/sections nettement séparés (contraste, pas uniforme) ?
- [ ] Padding adapté au rôle de chaque card (dense / info / hero) ?
- [ ] Valeurs revues pour mobile ?

**Couleur**
- [ ] Accent rare et justifié (chaque occurrence a une fonction) ?
- [ ] États de succès/erreur en couleurs sémantiques, pas en couleur brand ?
- [ ] Neutres avec une température cohérente, pas du gris générique ?
- [ ] Pas de glow néon sur des éléments non-CTA ?

**Décoration**
- [ ] Chaque icône aide à comprendre/trouver plus vite, sinon retirée ?
- [ ] Pas de pills pastel + emoji décoratif ?
- [ ] Kickers rares (jamais un par section), muted, pas brand ?
- [ ] Pas de gradient blob/mesh décoratif ni d'effet « premium » plaqué ?

**Formulaires**
- [ ] Type de form identifié (création / inscription / conversion) et règles adaptées ?
- [ ] Hiérarchie de labels claire (muted ou bold selon DA, pas tout au même poids) ?
- [ ] Bouton submit au label métier, dimensionné/aligné (pas pavé full-width générique) ?
- [ ] Pas de dropdowns multiples pour une donnée unique (heure/date) ?
- [ ] Validation custom (pas la popup native), sans saut de layout ?

**Données**
- [ ] Pas de stat cards qui dupliquent une liste juste en dessous ?
- [ ] Pas de « (N) » dans les titres de section ?
- [ ] Empty states courts (constat + contexte + action), sans emoji ?
- [ ] Tableaux : chiffres alignés à droite, colonne principale emphasée ?
- [ ] Nombres/devises au format local (FR/BE : `1 234,56 €`) ?
