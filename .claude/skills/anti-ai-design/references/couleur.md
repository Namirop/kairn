# Couleur & accent

## Les 3 rôles de la couleur

Cadre qui fait tenir toute la section :

1. **Identité / brand** — la couleur d'accent (rouge DevisRapide, doré Plarya). Rare, sur la conversion et l'identité.
2. **Sémantique / fonctionnel** — succès, erreur, warning, info. Communique un *état*, pas l'identité.
3. **Neutre** — les ≈ 90 % de l'UI (fonds, textes, bordures). C'est souvent là que vit la platitude IA.

Confondre ces rôles est la source de la plupart des problèmes de couleur (ex. un message de succès en couleur brand mélange rôle 1 et rôle 2).

## Surutilisation de l'accent

**❌ Tell** : couleur brand partout — icônes, bordures, puces, checks, kickers, glow, messages de succès, liens. L'accent perd son pouvoir : une « occurrence » = une apparition de la couleur à l'écran ; chaque occurrence dépense l'attention de l'utilisateur.

**✅** L'accent signale, il ne décore pas. Chaque occurrence doit avoir une fonction vérifiable : CTA primaire, prix, statut critique, identité brand sur 1-2 éléments. Sinon, **remplacer par un neutre** (gris/foreground) — pas juste retirer (sinon trou).

```
❌ titre doré + sous-titre doré + icône dorée + bordure dorée + badge "Premium" doré
✅ tout en neutre, doré réservé au seul CTA "Devenir expert"
```

Garde-fou : viser **rare et intentionnel**. « ≈ 3-5 occurrences brand par page » est un ordre de grandeur (un dashboard dense peut en avoir plus, avec ses statuts) — pas un compte absolu.

> Pas de couleur brand *obligatoire* : un produit peut être quasi-monochrome (option premium valide). Pour un changement systémique de couleur (touchant beaucoup d'endroits), procéder par **audit** (voir plus bas), pas en bulk.

## États sémantiques ≠ couleur brand

**❌ Tell** : « Sauvegardé », « Profil enregistré » en couleur brand → confusion succès/identité.

**✅** Succès/erreur/info en couleur **sémantique** ou foreground neutre selon le thème. Le vert n'est pas obligatoire : un neutre + une discrète icône check suffit dans la plupart des cas. La couleur brand reste sur la conversion et l'identité.

## Surface chaude

**❌ Tell** : un fond « chaud » (beige, brun) plaqué partout, y compris sur les outils internes, pour « réchauffer » l'UI.

**✅** Application directe du **registre marketing/interne** : surface chaude justifiable sur les **zones de conversion** (inscription, paywall, CTA majeurs) ; sur l'**interne** (dashboard, admin, settings), l'utilisateur est déjà engagé → fond neutre. Comme l'accent, une surface chaude partout perd son sens.

## Neutres : éviter le gris générique

**❌ Tell** : gris purs / Tailwind par défaut (#888 & co), froids, sans relation au brand. C'est un gros levier de « look IA » que personne ne corrige parce qu'on regarde l'accent.

**✅** Donner aux neutres une **température subtile** (légèrement chauds ou froids selon la DA), cohérente avec la couleur brand. Les fonds/surfaces/textes neutres ne sont pas du gris « neutre par défaut » : ils appartiennent à la palette.

## Audit avant un changement systémique

Uniquement pour un changement qui touche **beaucoup d'endroits** (couleur/police/token). Un fix local se corrige directement.

1. **Audit** : recenser toutes les occurrences (grep + repérage visuel). Compter.
2. **Catégoriser** : essentiel (CTA, prix, statut, identité) / à évaluer (kickers, labels, icônes) / à retirer (puces, checks déco, bordures gratuites, glow).
3. **Règle stratégique** par page.
4. **Passes successives** : retirer une catégorie, vérifier visuellement, continuer. Jamais de ménage en bulk (casse les usages légitimes).

> En rapportant un audit : scannable et priorisé (🔴/🟡/🟢), pas un pavé.
