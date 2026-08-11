# Kairn — Passe design

Le produit s'appelle désormais **Kairn**. L'interface affiche encore CAIRN partout.

Cette passe arrive avant la phase 4 pour une raison : la phase 4 construit le tableau de bord, le
cairn qui grandit, la série et les niveaux — les écrans les plus visuels de l'application. Les bâtir
dans la direction actuelle puis les refaire serait du travail en double.

C'est une passe de direction et de système, pas un habillage écran par écran. **Aucune logique
métier ne bouge.**

Consulte `.claude/skills/anti-ai-design/` avant toute décision visuelle, comme d'habitude.

---

## 1. Le renommage

CAIRN devient Kairn partout : interface, métadonnées, manifeste PWA, gabarits d'email, README,
titres de page, textes de la landing.

Attention à la casse. Le mot s'écrit **Kairn**, pas KAIRN ni kairn — y compris dans l'en-tête de
l'application, où il est aujourd'hui en capitales espacées. C'est un nom propre, il se compose comme
tel.

Le nom du dépôt, des branches et des chemins de fichiers reste inchangé : renommer ça n'apporte rien
et casserait les références.

**Le logo est en cours de refonte de mon côté** — symbole, mot, verrouillage, favicon. Ne le touche
pas et n'en fabrique pas. Garde la marque actuelle telle quelle, elle sera remplacée dans une passe
dédiée. Isole simplement le composant de marque pour que ce remplacement se fasse en un seul
endroit.

---

## 2. Le diagnostic

L'interface est juste sur le fond et se trompe de registre. Elle est **éditoriale** — une feuille
continue, un fond unique, des sections séparées par des filets d'un pixel, des angles droits, des
traits fins. Ça se lit comme un article de revue, pas comme une application.

L'inspiration Arc avait été retenue en phase 0 et ne se retrouve pas. Mais ce qu'il faut lui
emprunter n'est **pas sa palette** — indigo saturé, crème, autocollants, c'est un registre joueur
qui ne va pas à Kairn. Ce qu'il faut lui emprunter, c'est sa **structure** :

- une page faite de **panneaux empilés**, chacun avec son propre fond, plutôt qu'une feuille unique
- des **transitions franches** entre panneaux, pas des filets
- des **formes pleines, épaisses, généreusement arrondies** plutôt que des traits fins et des angles
  vifs

Kairn garde son registre minéral, calme, texturé. Il gagne de la matière et du rythme.

---

## 3. Les surfaces

Aujourd'hui il n'y a qu'un gris pierre. Il en faut plusieurs, tous dans la même famille minérale —
aucune couleur nouvelle, aucune teinte saturée.

```
--surface-papier   #F2F2EF   la base actuelle
--surface-ombre    #E4E4DF   panneau alterné, à peine plus profond
--surface-lichen   #E8EADF   teinte lichen très désaturée, un panneau au plus
--surface-roche    #2A2E2C   panneau sombre, un ou deux dans toute l'application
```

Une page se compose en alternant ces surfaces. Sur le panneau sombre, le texte et les pierres
s'inversent en gris clairs — **le sommet lichen reste lichen**, c'est la constante de l'identité.

---

## 4. Le rythme, et le vide

Deux problèmes de mise en page, visibles sur toutes les captures.

**Les sections sont séparées par des filets.** Remplace-les par des changements de surface. Une
section, c'est un panneau pleine largeur avec son propre fond ; le lecteur descend une pile, il ne
suit pas un article.

Pour la jointure entre deux panneaux, ne copie pas les bords déchirés d'Arc. Utilise ce que la
métaphore te donne : une **bande de strates** — deux ou trois lignes horizontales irrégulières,
comme une coupe de roche — ou une **dispersion de pierres** qui traverse la jointure. Une seule des
deux, appliquée partout.

**Le contenu occupe un tiers de l'écran et les deux tiers droits sont vides.** Visible sur Réglages,
sur le tableau de bord, sur la page de dépôt. Ce n'est pas de la respiration, c'est une largeur
maximale posée sans mise en page autour.

Deux corrections : centre la colonne au lieu de l'aligner à gauche, et sur les écrans larges,
occupe l'espace avec le contenu qui existe déjà plutôt que de le laisser blanc — le cairn, les
statistiques, la liste des dépôts. Vérifie à 1440 px **et** à 2560 px.

---

## 5. Le système de formes

C'est ce qui fait qu'une interface se lit comme une application plutôt que comme un document.

- **Échelle de rayons franche.** Les boutons deviennent des pilules, les cartes prennent un rayon
  généreux. L'angle droit disparaît sauf sur les panneaux pleine largeur.
- **Des surfaces pleines plutôt que des bordures.** Une carte se distingue par son fond, pas par un
  trait gris d'un pixel.
- **Des états interactifs qui se sentent.** Un bouton au survol change de surface, pas seulement
  d'opacité. Une carte cliquable se soulève légèrement.
- **Le grain, enfin visible.** Il est déjà en place mais à une opacité qui le rend invisible. Monte-
  le jusqu'à ce qu'il se sente sur les grandes surfaces, sans se voir sur le texte.

---

## 6. Le motif de pierre

Il ne vit aujourd'hui qu'à deux endroits. Étends-le, en commençant par celui où il n'est pas
décoratif.

**Le compteur de session.** Aujourd'hui « 2 / 9 » en petit gris. Remplace-le par un empilement qui
se construit à chaque réponse : neuf emplacements, deux pierres posées. Même métaphore que le cairn
du tableau de bord, à l'échelle d'une session. C'est le meilleur endroit du produit pour ce motif,
parce qu'il y **informe** au lieu de décorer.

Ensuite, par ordre d'intérêt :

- les **états vides** : une pierre seule posée au sol, pas une icône
- les **états de chargement** : un empilement en cours de construction
- une **silhouette de cairn en très faible opacité** comme texture de fond sur un panneau

Toute géométrie de pierre vient du composant `Cairn` existant. N'en redessine pas une seconde : le
jour où le logo arrivera, tout doit dériver de la même source.

---

## 7. Ce qui ne bouge pas

- La typographie et l'échelle typographique
- Les textes d'interface, sauf le renommage
- Toute la logique métier, les routes, les schémas
- Le logo, en cours de refonte

Si tu te surprends à réécrire une phrase d'interface ou à toucher à `lib/domain/`, tu as débordé.

---

## 8. Vérification

- [ ] Aucune occurrence de CAIRN ou Cairn dans l'interface, les métadonnées, le manifeste ou les
      emails — le nom du dépôt et les chemins restent inchangés
- [ ] Le composant de marque est isolé, remplaçable en un seul endroit
- [ ] Les quatre surfaces sont des tokens, aucune valeur en dur ailleurs
- [ ] Chaque page se lit comme un empilement de panneaux, pas comme une feuille continue
- [ ] Aucune section séparée par un filet d'un pixel
- [ ] Correct à 375 px, 1440 px et 2560 px — pas de colonne isolée dans un désert blanc
- [ ] Contrastes AA sur toutes les surfaces, y compris la sombre
- [ ] `prefers-reduced-motion` respecté sur les nouveaux états interactifs
- [ ] Navigation clavier avec focus visible sur toutes les nouvelles formes
- [ ] `npm test`, typecheck, build, ESLint : propres

Avant d'écrire du CSS, envoie-moi en une réponse courte : les quatre surfaces avec leur emploi,
l'échelle de rayons, le traitement de jointure que tu retiens, et un croquis ASCII de la page
d'accueil en panneaux. Comme en phase 0, c'est le seul moment où corriger la direction coûte cinq
minutes.
