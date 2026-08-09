# Données

## Stat cards « vanity »

**❌ Tell** : 3 stat cards en haut d'un dashboard avec gros chiffre + label (« 12 / Abonnements », « 47 / Achats ») alors que ces chiffres sont déjà visibles dans la liste juste en dessous. Duplication.

**✅** :
- **Intégrer en prose** : `12 abonnements actifs · 47 achats · 8 sports suivis`.
- **Supprimer** si redondant avec une liste proche.

**Garder les stat cards** uniquement si : dashboard analytique (admin/BI), donnée **non répétée** ailleurs, lecture rapide du chiffre = usage principal, et chiffres **actionnables** (revenus à reverser, factures en attente). Sur une page « Mon compte », des stat cards vanity sont du bruit.

## Compteurs entre parenthèses

**❌ Tell** : « Abonnements actifs (3) », « Historique (47) ». Personne n'écrit comme ça, et le nombre est déjà visible dans la liste.

**✅** Titre sans compteur. Si le compte est vraiment utile (longue liste paginée), mention discrète en sous-titre : `Historique` + `47 achats au total`.

## Chiffres décontextualisés

**❌ Tell** : « 67% », « 142 » en grand sans explication → impression de remplissage.

**✅** Toujours un contexte/une unité : « 80% du CA te revient » (pas « 80% »), « 30 sec pour publier » (pas « 30 »). Mieux : intégrer le chiffre dans une phrase.

## Méta-données : prose, pas table de specs

**❌ Tell** : méta-données passives rendues comme une mini-table de specs.

**✅** Présenter en prose quand ça lit plus humain :

```tsx
// ❌ rendu "table de specs"
<dl><dt>Inscrit depuis</dt><dd>12 mois</dd>
    <dt>Dernière connexion</dt><dd>2 jours</dd></dl>

// ✅ prose
<p className="text-muted-foreground">
  Membre depuis janvier 2026 · Dernière visite il y a 2 jours
</p>
```

> Le tell est la **présentation visuelle**, pas la balise : `dl/dt/dd` reste correct sémantiquement (a11y). On peut le garder et le styler en prose. On vise le rendu « table », pas l'élément.

## Empty states

**❌ Tell** : illustration + emoji 📭 + 3 phrases qui disent la même chose + CTA.

**✅** Court : un constat, un contexte, une action (si elle a du sens). Pas d'emoji décoratif. Pas d'illustration sauf si vraiment travaillée et porteuse d'identité.

```tsx
<div className="text-center">
  <p className="text-foreground">Aucun message</p>
  <p className="text-muted-foreground">Les nouveaux messages apparaîtront ici.</p>
  <Button>Composer</Button>
</div>
```

## Tableaux

**❌ Tell** : colonnes au même poids, zebra striping par défaut, texte centré dans les cellules, chiffres mal alignés.

**✅** :
- **Chiffres alignés à droite** + `tabular-nums` ; texte à gauche.
- **Colonne principale emphasée** (poids, ou taille), les autres en retrait.
- **Pas de zebra par défaut** : séparateurs de ligne discrets, ou rien. Densité de padding adaptée (voir `espacement.md`).

## Formatage des nombres / devises (FR/BE)

**❌ Tell** : format US par défaut (`$1,234.56`, virgule milliers, point décimal).

**✅** Format local :
- Français/belge : `1 234,56 €` — espace (insécable) comme séparateur de milliers, virgule décimale, symbole € **après** le nombre.
- Abréger les grands nombres quand utile (`1,2 k`, `3,4 M`).
- Utiliser `Intl.NumberFormat('fr-BE', …)` plutôt qu'un formatage maison.

## (Optionnel) Skeleton vs spinner

Pour un chargement, un **skeleton** qui épouse la forme du contenu à venir > un spinner : plus pro, et évite le saut de layout (même logique que la réserve d'espace en validation, voir `formulaires.md`).
