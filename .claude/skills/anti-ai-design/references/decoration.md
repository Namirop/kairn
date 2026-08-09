# Décoration

Rappel du principe n°1 : aucun de ces éléments n'est interdit ; c'est l'usage décoratif par défaut qui est le tell.

## Icônes

**❌ Tell** : une icône à côté de chaque mot, traduction littérale du texte (étoile pour « Visibilité », éclair pour « Rapide »). Décoration plaquée, zéro info ajoutée — le mot est déjà là.

**✅** Une icône doit avoir une **fonction**, pas une équivalence sémantique.
- **Bien** (elle fait gagner en reconnaissance/scan, ou porte une info que le mot ne donne pas) : actions récurrentes (fermer, supprimer, éditer, rechercher), navigation, statuts, drapeau = langue, logo = source. Surtout en UI **dense/fonctionnelle**.
- **Non** : elle répète le texte adjacent.

**Test** : « est-ce que cette icône m'aide à comprendre/trouver plus vite *sans lire*, ou répète-t-elle le texte d'à côté ? » Si elle répète → retirer.

Antidote pour des « value props » : un **chiffre précis** ou un **mini-graphique** porte souvent plus qu'un picto — *quand le bénéfice est chiffrable* (sinon, prose claire). Ne pas en faire un réflexe systématique.

## Pills / chips

**❌ Tell** : pills `rounded-full` + fond pastel + emoji décoratif (`🌿 Holistique`, `🔥 Trending`, `💎 Premium`). Look « wellness app » générique.

**✅** Le `rounded-full` n'est **pas** le problème (forme légitime et répandue) — le **combo décoratif** l'est. Selon le contexte :
- Tags inline éditoriaux : préfixe `+`/`✓`, sans fond.
- Tags textuels uppercase avec middot : `FOOTBALL · TENNIS · BASKET`.
- Si pill il y a, qu'elle ait un rôle (filtre actif, statut), pas une déco.

Emoji : seulement s'il est **fonctionnel** (drapeau d'un pays pour la langue), jamais décoratif systématique.

## Kickers (eyebrows)

Le petit label au-dessus d'un titre (« POURQUOI NOUS »). Device éditorial **légitime**, pas intrinsèquement IA.

**❌ Tell** : un kicker doré/uppercase au-dessus de **chaque** section → odeur de template.

**✅** Par défaut : **parcimonie, voire pas du tout** (souvent supprimable sans perte). Si gardé : muted (pas brand), 1-2 par page max, **jamais un par section**.

## Mockups / illustrations de produit

**❌ Tell** : « card avec icône User + pseudo + chips + stats » stylisée. Wireframe générique.

**✅** Rendre le mockup vivant :
- **Visages réels** (vrais avatars) — un visage humain casse le wireframe.
- **Composition asymétrique** : légère rotation, stack de plusieurs mockups, profondeur (pas une card flottante centrée).
- **Micro-détails de vie** : point « live » vert, timestamp précis (`AUJOURD'HUI · 16:30`), données concrètes (pas `$XX,XXX`).
- **Format inattendu** : faux chrome de navigateur (dots macOS + barre d'URL), preview iPhone, capture « ouverte dans Figma ». *(Recoupe l'élément signature métier — voir `structure.md`.)*

Ces détails coûtent peu et changent radicalement la perception.

## Faux effets « premium » (le cluster qui crie IA)

Famille d'effets décoratifs plaqués, tous des tells forts. Défaut : **ne pas les mettre**.

- **Glow / shadow néon** (box-shadow en couleur brand sur des cards, bordures qui luisent) : en 2026 c'est cramé. **Défaut = pas de glow**, même sur le CTA. Pour faire ressortir un élément : une nuance de fond (luminosité ±3-5%), pas un glow. Pour un focus : bordure qui change d'opacité, pas un ring néon.
- **Gradient blanc au centre d'un bouton coloré** : faux effet « verre/premium ». Préférer une couleur plate bien choisie (ou un gradient uniforme dans les tons du brand). Souvent : pas de gradient du tout.
- **Gradient blob / mesh / aurora** en fond (gros dégradé flou, blobs colorés, « auroras ») : sans doute le tell déco IA le plus reconnaissable. Préférer un fond neutre/plein ou une texture discrète ; la profondeur vient de la **structure**, pas d'un blob.
- **Glassmorphism abusé** (flou + transparence partout) : à réserver, jamais comme style par défaut.
