# Structure & composition

Application du principe **Contenu avant container** et du principe n°1 (l'élément n'est pas le problème, son usage par défaut l'est).

> Les antidotes ci-dessous ne sont pas un menu où l'on pioche le premier. **Déduis du contenu ce qu'il est** et choisis l'antidote dont la condition correspond. Ne remplace pas un défaut (3 cards) par un autre défaut (stats géantes partout).

## Grille de N cards uniformes

**❌ Tell** : grille `1fr 1fr 1fr` de cards identiques, chacune icône-en-haut + titre + paragraphe, même taille, même radius, même ombre. Lecture immédiate : « généré ».

```tsx
// ❌ pattern reconnaissable instantanément
<div className="grid grid-cols-3 gap-6">
  <Card><Icon /><Title /><Description /></Card>
  <Card><Icon /><Title /><Description /></Card>
  <Card><Icon /><Title /><Description /></Card>
</div>
```

**Les cards ne sont pas le problème** (elles sont partout, légitimement). Le tell, c'est la grille de cards *uniformes, sans hiérarchie, en container par défaut*. Carte IA vs bonne carte :

- **Carte IA** : N identiques, grille symétrique, structure répétée, container même quand le contenu n'a pas besoin d'être contenu, zéro hiérarchie.
- **Bonne carte** : a une fonction (grouper de l'info liée, ou unité cliquable), tailles/emphase variées, densité réelle (pas une ligne noyée dans du padding), traitement différencié.

**✅ Antidotes (chacun sa condition)** :

- **Garde les cards, casse l'uniformité (bento)** — *quand le contenu gagne à être groupé en unités.* Cards de tailles différentes selon l'importance (une grande + plusieurs petites), densité réelle, hiérarchie. C'est l'option « moderne avec cards » sans le tell.
- **Stats nues sans card** — *quand le bénéfice est quantifié (un chiffre fort existe).* Chiffre en grand + label, sans container. ⚠️ Ne pas en faire l'antidote-roi : « stats géantes partout » devient un tell à son tour.
- **Liste éditoriale** — *quand c'est qualitatif/narratif (pas de chiffres).* Liste verticale, puces typographiques fortes, sans card.

**Quand la grille symétrique est valide** : comparaison item-à-item réelle (3 plans tarifaires côte à côte). Là, la symétrie *est* le message.

## Symétrie excessive / centrage par défaut

**❌ Tell** : tout est centré — hero, sections, CTAs, footer. L'écran flotte, aucune hiérarchie.

**✅ Principe** : l'alignement est une **décision**, pas un défaut.
- Gauche = défaut de lecture pour le contenu (langues latines). **Jamais de texte long centré** (le bord gauche en dents de scie casse la lecture).
- Centrer = emphase **délibérée** (hero, phrase courte percutante, CTA), appliquée de façon **cohérente**.
- Un hero centré n'est pas un problème ; *tout* centrer sans hiérarchie l'est.
- Ne pas alterner l'alignement « pour faire du rythme » : la cohérence dans un groupe prime sur la variation forcée.

## Layout : poids du contenu, pas 50/50 par défaut

**❌ Tell** : tout en `1fr 1fr` (50/50), équilibre parfait, générique.

**✅** Découpe les colonnes **selon le poids relatif des contenus**. La colonne dominante porte le contenu principal, la secondaire le contexte/preview/aide. Les ratios (≈ 60/40, 70/30…) sont des illustrations, pas un menu : déduis du contenu, ne colle pas un ratio par réflexe. Sur mobile, on empile (les ratios horizontaux disparaissent).

> Cas particulier du principe transversal : **asymétrie = reflet du poids du contenu** (vaut aussi pour les compositions de cards, pas que les colonnes).

## Élément signature métier (produits publics)

Application du principe directeur n°7. Sur un produit **public**, un seul pattern visuel propre au métier, sur l'écran le plus vu, le rend mémorable. Sur de l'interne : ne pas en mettre.

**Tu ne l'inventes pas à froid** (c'est ce qu'une IA rate) : tu **choisis et adaptes** dans un menu d'exemples selon le métier :

| Métier | Exemple d'élément signature |
| --- | --- |
| Plateforme de publication | preview « navigateur » intégrée (chrome avec dots macOS + barre d'URL) pendant la rédaction |
| App de fitness | timeline en bande dessinée avec dates clés |
| App de musique | forme d'onde stylisée comme élément d'identité |
| Outil de finance | grille tabulaire avec séparateurs typographiques type journal |
| Billetterie | format « ticket » déchiré sur les confirmations |

Le pattern apparaît à des endroits stratégiques (home, écran principal, confirmations) et devient la signature. Pour un rendu vraiment fort, l'œil d'un humain (designer) vaut mieux qu'une génération auto.

## Appendice — Inspiration hors mainstream

> ⚠️ PLACEHOLDER à compléter par Romain (liste rafraîchissable, pas figée dans le cœur du skill).

Ne pas se limiter à Linear/Vercel/Stripe/Notion (les références « IA »). Élargir vers : marques de luxe, magazines éditoriaux, studios créatifs, portfolios de designers indépendants, produits artisanaux. **Éviter les sites-trophées (Awwwards & co)** : sur-animés, mauvais modèles pour du fonctionnel.

Format à remplir — pour chaque référence, **ce qu'il faut en voler** (pas juste l'URL) :

```
- [SITE / URL] → à voler : [la technique précise — ex: échelle de titres, rythme d'espacement, discipline de couleur]
- ...
```
