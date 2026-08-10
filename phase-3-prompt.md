# Cairn — Phase 3 : le moteur de révision

C'est le cœur du produit. Tout ce qui précède existe pour alimenter cette phase, tout ce qui suit
la décore.

Relis `CLAUDE.md`. La règle centrale y est rappelée et elle gouverne tout ce fichier : **la
planification porte sur l'Atom, jamais sur le Variant.** Un intervalle, une difficulté ou une
échéance attachés à une variante sont un bug d'architecture, pas un raccourci.

---

## 1. Ce qui est dû aujourd'hui

Les concepts d'une session sont ceux dont l'échéance est passée, dans le **jour civil de
l'utilisateur** — pas en UTC. `local-day.ts` fait déjà ce calcul, sers-t'en.

Ordonne-les en mélangeant les sujets plutôt qu'en groupant par tag ou par dépôt. Alterner les
domaines produit une meilleure rétention que réviser par blocs, même si le bloc est plus
confortable sur le moment. Ne donne pas le confort par défaut.

Plafonne la session à une taille raisonnable et reporte le reste au lendemain : mieux vaut finir
une session courte que d'en abandonner une longue.

**Ne complète jamais avec des concepts non échus.** Si trois concepts sont dus, la session en compte
trois, et l'écran de fin dit que c'est terminé. Être à jour est un état normal, pas un vide à
combler. Une révision anticipée peut exister, mais comme une action que l'utilisateur choisit
explicitement, jamais comme un remplissage silencieux.

---

## 2. La rotation des variantes

À chaque fois qu'un concept remonte, on sert la variante de la **facette la moins vue**, en
départageant par la plus ancienne. Jamais deux fois la même facette d'affilée sur un même concept.

C'est ce qui fait qu'un concept revu cinq fois reste inconfortable : la personne doit connaître
l'idée, pas se souvenir d'une phrase.

Quand les quatre facettes d'un concept ont chacune été vues trois fois, mets en file une
régénération de ses variantes. Elle passe par le chemin groupé de la phase 2 — c'est du travail qui
peut attendre. Le seuil est une constante nommée, pas un nombre perdu dans une condition.

---

## 3. Répondre

Le geste doit être court. Une question, une réponse, on enchaîne.

**Formats fermés** — `MCQ`, `TRUE_FALSE`. La justesse est connue sans jugement humain. Une mauvaise
réponse vaut `AGAIN`, une bonne vaut `GOOD`, et l'utilisateur peut préciser « facile » d'un geste
s'il veut espacer davantage. Une seule action dans le cas courant.

**Formats ouverts** — `SHORT_ANSWER`, `EXPLAIN`, `CODE`. La personne répond librement, puis on lui
montre `answerKey` et elle se juge elle-même sur les quatre niveaux. Présente `answerKey` comme un
étalon à comparer, pas comme une correction qui tombe : la formulation de l'écran compte autant que
celle du prompt.

**Ne félicite jamais une bonne réponse.** La récompense est la progression, pas un compliment.

Le temps de réponse se mesure de l'affichage de la question à la validation, et **jamais au-delà de
l'affichage de la réponse**. Une bonne réponse en deux secondes et une bonne réponse en vingt-cinq
secondes ne disent pas la même chose : la première est un rappel, la seconde une reconstruction.
C'est le signal le plus précieux de cette phase, ne le pollue pas.

Chaque révision est écrite **immédiatement**. Une session interrompue à la troisième question sur
dix garde ses trois révisions. Personne ne perd son travail parce qu'il a fermé un onglet.

---

## 4. La planification

`ts-fsrs`, jamais un algorithme réécrit à la main. La bibliothèque prend l'état du concept et la
note, et rend le nouvel état : intervalle, stabilité, difficulté, prochaine échéance. On le stocke
tel quel.

La logique qui l'entoure — quels concepts sont dus, dans quel ordre, quelle variante servir — vit
dans `lib/domain/`, en fonctions pures, avec l'instant passé en paramètre. Elle est testée sans
base ni horloge système.

---

## 5. Les états de maîtrise

Une machine à états dérivée de données qu'on possède déjà. Aucun appel modèle, aucun calcul coûteux :
un champ mis à jour à chaque révision.

```
LEARNING      intervalle < 7 jours
REVIEWING     7 à 21 jours
CONSOLIDATED  plus de 21 jours et trois réussites d'affilée
ARCHIVED      déclaré par l'utilisateur, ou intervalle au-delà de six mois
```

**Le bouton « je maîtrise ça »**, sur la carte de révision. Le concept passe en `ARCHIVED`, avec
`archivedByUser` à vrai.

Archivé ne veut pas dire supprimé : l'échéance part à six mois, le concept ne sort pas du système.
La thèse du produit est que les gens croient savoir et oublient — prendre la déclaration au pied de
la lettre reviendrait à contredire le produit. Six mois plus tard, une seule question revient. S'il
réussit, c'est une victoire réelle ; s'il rate, il vient de comprendre pourquoi Cairn existe.

L'archivage se défait, et l'écran doit le dire sans que l'utilisateur ait à chercher.

---

## 6. Le moment « tu maîtrises ça »

C'est la fonctionnalité que Romain a demandée, et elle ne coûte rien : tout est dans les données de
`Review`.

Le signal : **trois réussites consécutives avec un temps de réponse décroissant.** Pas seulement
trois bonnes réponses — trois bonnes réponses de plus en plus rapides. C'est la différence entre
savoir reconstruire et savoir tout court.

Quand il se déclenche, une carte à la fin de la session : le concept, et l'écart de vitesse entre
la première réussite et la dernière. Pas de fanfare, pas d'emoji, une constatation.

Au plus une par session, et jamais deux fois pour le même concept. Ce qui est rare fait plaisir ;
ce qui tombe à chaque session devient du bruit qu'on apprend à ignorer.

Le calcul vit dans `lib/domain/`, en fonction pure, et il est testé sur des séries fabriquées à la
main : trois réussites qui accélèrent, trois réussites qui ralentissent, trois réussites au même
rythme, une série interrompue par un échec.

---

## 7. La fin de session

Un écran sobre : ce qui vient d'être revu, ce qui revient demain, et la carte de maîtrise si elle
s'est déclenchée.

Pas de score, pas de série, pas de niveau — c'est la phase 4. Si tu te surprends à ajouter un
compteur, tu as débordé.

---

## 8. Les états vides

Trois cas, trois écrans, tous écrits selon les règles d'écriture du `CLAUDE.md` :

- **Rien à réviser aujourd'hui** — c'est une réussite, pas un vide. Dis quand la prochaine échéance
  tombe.
- **Aucun concept du tout** — renvoie vers le dépôt, sans culpabiliser.
- **Des concepts, mais pas encore de questions** — les lots groupés sont en attente. Dis-le
  simplement, sans exposer la file de jobs.

---

## 9. Ce qui n'est PAS dans cette phase

Le tableau de bord, le cairn qui grandit, la série, l'XP, les niveaux, les notifications. Rien de
tout ça, même si c'est tentant en passant.

---

## 10. Vérification

- [ ] Une session complète tourne de bout en bout en mode mock
- [ ] Les concepts dus se calculent dans le jour civil de l'utilisateur, pas en UTC — testé sur
      deux fuseaux
- [ ] La même facette n'est jamais servie deux fois d'affilée sur un concept
- [ ] Une session interrompue garde les révisions déjà faites
- [ ] Le temps de réponse s'arrête à la validation, jamais après l'affichage de la réponse
- [ ] Les transitions d'état sont testées aux bornes : 7 jours, 21 jours, six mois
- [ ] Le signal de maîtrise se déclenche sur une série qui accélère et pas sur une série qui
      ralentit
- [ ] Aucune variante ne porte d'intervalle, de difficulté ni d'échéance
- [ ] `npm test`, typecheck, build, ESLint, `verify:ai` : propres
- [ ] Correct à 375 px et à 1440 px, navigation clavier possible sur toute la session

Ne lance rien contre l'API : Romain lance lui-même.

Récapitulatif à la fin. Et pour la passe visuelle, prépare de quoi la faire toi-même autant que
possible — la dernière fois, le bug le plus grave de la phase n'était visible que dans le
navigateur, et la vérification automatique le manquait parce qu'elle contournait le formulaire.
