# Espacement

Application du principe **Proximité = sens**.

## Espacement uniforme (le pain point n°1)

**❌ Tell** : tout à 16-24px — `gap`, `margin-bottom`, tout flotte pareil. Aucune hiérarchie : l'œil ne voit pas la structure. Biais fréquent : autant d'espace entre un titre et *son propre contenu* qu'entre deux sections → la hiérarchie s'aplatit.

**✅ Loi de proximité (Gestalt)** : les éléments d'une même unité sont *proches*, les groupes distincts sont *séparés*. La hiérarchie naît du **contraste** entre espacements, pas des valeurs absolues.

| Relation | Espacement (marketing) |
| --- | --- |
| Éléments liés (kicker + titre, label + input) | ≈ 4-12px |
| Même groupe (titre + paragraphe) | ≈ 16-24px |
| Sous-sections d'une section | ≈ 40-56px |
| Sections différentes (changement de sujet) | ≈ 80-120px |
| Grandes ruptures éditoriales | ≈ 140-200px |

- **Valeurs calibrées marketing/public.** En **interne dense** (dashboard, admin), **compresser fortement les paliers hauts** : une section interne ne se sépare pas par 120px. Le *rapport* proche/loin reste, l'échelle baisse.
- **Direction de correction** (CC sur-espace uniformément) : *resserre l'intra-groupe ET augmente le contraste inter-groupes* — pas « tout compacter » (ce serait juste de l'uniforme plus serré). C'est le contraste qui crée la structure.
- **Mobile** : diviser les valeurs par ≈ 1.4-1.6 en gardant les ratios (les très grands paliers deviennent insupportables sur petit écran).

## Line-height des titres

Un titre sur 2 lignes = **une unité** : ses lignes doivent être proches. `line-height` serré (≈ 1.0-1.1) sur les gros titres ; un line-height de body (1.4-1.5) ferait flotter les deux lignes comme deux choses séparées. (Voir aussi `typographie.md`.)

## Padding selon le rôle

**❌ Tell** : `padding: 24px` (ou une valeur moyenne unique) sur toutes les cards quel que soit leur contenu. Les contenus denses (lignes de tableau, items de liste) sont trop aérés.

**✅** Ajuster le padding au rôle/densité (ordres de grandeur) :

- Cards utilitaires denses (lignes, items) : ≈ 12-16px
- Cards informatives (preview, résumé) : ≈ 20-28px
- Cards hero / mises en avant (CTA, pricing) : ≈ 32-48px

**Mobile** : réduire le padding, surtout les cards hero (≈ 32-48 → ≈ 20-24), sinon oppressant sur ~380px. Biais CC : sur-padder les contenus denses → resserrer.
