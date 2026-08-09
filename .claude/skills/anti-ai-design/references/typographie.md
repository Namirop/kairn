# Typographie

## Choisir une police (le point dur)

**❌ Tell** : Inter, Roboto, Work Sans, Open Sans par défaut. Excellentes mais saturées dans le SaaS — l'œil informé les reconnaît comme « génériques ».

**✅ Méthode** : une police ne se choisit pas dans le vide, elle se choisit pour **matcher un caractère** que le projet doit dégager. Quand « ça ne va pas », c'est presque toujours une dissonance entre le caractère de la police et celui du projet.

1. **Situe le projet** sur quelques axes : sérieux/institutionnel ↔ joueur/expressif · technique/fonctionnel ↔ éditorial/chaleureux · classique ↔ moderne/tranchant.
2. **Choisis une police dont le caractère matche** cette position (shortlist ci-dessous, par caractère).
3. **Workflow** : proposer 2-3 candidats *avec une justification liée au caractère* (« X parce que le projet veut une DA chaleureuse »), puis laisser l'humain trancher. Accepter une part d'essai — la typo est un des choix les plus durs.

> Règle simple : la police va bien quand son caractère matche le projet. Une serif éditoriale chaleureuse sur un dashboard technique grince.

### Shortlist par caractère
> ⚠️ PLACEHOLDER — liste à affiner/rafraîchir par Romain (les polices « fraîches » périment : Geist est déjà très associé à Vercel). Ceci est un point de départ, pas une vérité figée.

- **Neutre-technique** (à fuir si on veut sortir du moule) : Inter, Geist.
- **Grotesque humaniste / chaleureux** : Mona Sans, Hubot Sans, Switzer, General Sans, Manrope.
- **Éditorial (serif display)** : Fraunces, Editorial New.
- **Grotesque tranchant / contemporain** : PolySans, Söhne, Bricolage Grotesque.

## Tailles de titres

**❌ Tell** : H1 hero à 40-60px, H2 à 24-32px. Le titre est « lisible » mais ne porte pas le design → la composition dépend des décorations (gradients, glow, icônes) pour exister.

**✅ Principe** : un titre doit être assez grand pour **porter** le design. Les valeurs ci-dessous sont des **ordres de grandeur à calibrer**, pas des absolus — ce qui compte, c'est le *rapport* entre niveaux (un H1 marketing écrase un H2, qui écrase le body). La table est segmentée par contexte (= le principe « registre marketing/interne ») :

| Niveau | Desktop | Mobile |
| --- | --- | --- |
| H1 hero marketing | ≈ 88-120px | ≈ 48-64px |
| H2 sections marketing | ≈ 56-72px | ≈ 36-44px |
| H1 pages internes (dashboard) | ≈ 32-40px | ≈ 24-28px |
| H2 sections internes | ≈ 20-24px | ≈ 18-20px |

- `line-height` des titres multi-lignes : **0.95-1.05** (pas 1.3-1.5 comme du body) — un titre = une unité, ses lignes restent proches.
- `letter-spacing` négatif léger (≈ -0.02 à -0.04em) sur les très gros titres.
- Sur mobile, pousser les tailles plus haut que ce qui « paraît raisonnable » en maquette : juste à l'œil sur écran.

## Police display vs body

- **Body** = la police du texte lisible (paragraphes, labels, boutons, champs, tableaux). Optimisée pour la lisibilité en petit. Neutre, elle s'efface.
- **Display** = une police réservée aux **grands titres**, choisie pour son caractère. Superbe en grand, fatigante en corps de texte.

**❌ Tell** : la police display utilisée aussi pour les titres internes (dashboard, modale, formulaire) → elle perd son pouvoir éditorial et nuit parfois à la lisibilité.

**✅ Règle** : display = **marketing uniquement**. Hors marketing, body en bold (700) / semibold (600). Le contraste vient de la hiérarchie (taille + poids), pas du changement de famille.

Cas borderline (composant partagé marketing + interne) : **splitter en deux composants** (`MarketingSectionTitle` vs `SectionTitle`) plutôt qu'un prop `variant` — le nom force la règle.

## Chiffres : `tabular-nums`

**❌ Tell** : chiffres mal alignés dans une grille/tableau (« 127 » plus large que « 117 »). Effet amateur.

**✅** `font-variant-numeric: tabular-nums` (Tailwind : `tabular-nums`) dès que les chiffres **s'alignent entre eux** (tableaux, colonnes, stats empilées) **ou changent/s'animent** (compteurs, valeurs live — sinon le layout tremble à chaque digit). Un chiffre isolé qui ne s'aligne avec rien et ne bouge pas : indifférent.

```tsx
<span className="text-4xl font-bold tabular-nums">{value}</span>
```
