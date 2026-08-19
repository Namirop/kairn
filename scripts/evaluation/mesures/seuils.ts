/**
 * Les planchers, posés à la main le 18 août 2026.
 *
 * Sur `voyage-3.5-lite`, 1024 dimensions, à la lecture du figé
 * `2026-08-14-20h39.json` — 26 dépôts, 286 segments, 123 concepts. **Ils ne
 * valent que pour cet espace-là.** Changer le modèle d'embedding les périme
 * tous : deux modèles ne placent pas les mêmes textes aux mêmes distances, et
 * un plancher recopié d'un espace à l'autre ne mesure plus rien. La constante
 * du modèle est dans `espace.ts`, et le rapport écrit les deux côte à côte.
 *
 * **Un plancher n'est pas un verdict, c'est un filet de candidats pour un
 * juge.** Trop large coûte quelques centimes d'appels ; trop étroit coûte des
 * manques silencieux, le défaut jugé le plus grave du produit. En cas de doute,
 * on élargit — c'est le principe qui a fixé les trois valeurs.
 */

/**
 * Couverture : sous ce plancher, une phrase du dépôt est candidate au manque.
 *
 * 0,55 et non 0,50, qui était le premier décile. Le cas de démonstration du
 * manque — les deux phrases de `18-anglais` que le concept unique ne couvre
 * pas, l'exemple de Wald et celui des habitudes de fondateurs — se tient à
 * 0,518 et 0,533. Un plancher à 0,50 rate le cas d'école : il est mal réglé par
 * construction. La bande 0,50–0,55 porte encore du substantiel — « On ne gagne
 * pas en vidant sa main dans Le Fil » de `24` à 0,535, la brindille sous dix
 * pour cent d'humidité de `22` à 0,518, les filtres orangés de `23` à 0,517.
 */
export const PLANCHER_COUVERTURE = 0.55;

/** Soutien : sous ce plancher, un concept est candidat à l'invention. Premier décile. */
export const PLANCHER_SOUTIEN = 0.75;

/**
 * Doublon : au-dessus de ce plancher, deux concepts sont candidats à la redite.
 *
 * Le rappel prime, parce que ce plancher n'est plus une ligne de verdict — le
 * juge du doublon tranche derrière lui.
 *
 * **0,63 et non 0,70**, descendu à l'arrêt 2 du 18 août. Le filet à 0,70 laissait
 * passer la paire concept-instance de `11`, à 0,637, qu'aucun autre détecteur ne
 * voit — l'ablation ne la rattrape pas non plus, voir plus bas. Descendre coûte
 * presque rien : le juge est appelé par dépôt avec ses candidats groupés, donc
 * passer de 57 à 151 paires ajoute cinq appels, pas quatre-vingt-quatorze. Le
 * rapport rend le rendement par bande, 0,63–0,70 contre au-dessus de 0,70 :
 * c'est lui qui dira plus tard s'il faut resserrer le filet ou sonder dessous.
 *
 * **Limite connue, et elle n'est pas rattrapable par un seuil.** La paire
 * concept-instance de `11` — « le pH du sol détermine la couleur de
 * l'hortensia » et « c'est le sol qu'on corrige, pas la plante » — plafonne à
 * 0,637, sous tout plancher exploitable. Un filet par paires ne prend pas ces
 * cas-là, et **l'ablation ne les prend pas non plus** : l'épreuve du 18 août
 * montre que retirer un concept redondant fait chuter la couverture autant que
 * retirer un concept distinct — plus, même, sur `15` et `16`. Redondant entre
 * concepts n'implique pas substituable au niveau de la phrase. Ce cas reste
 * ouvert ; voir le rapport d'ablation.
 */
export const PLANCHER_DOUBLON = 0.63;

/** La frontière des deux bandes de rendement du juge du doublon. */
export const BANDE_DU_DOUBLON = 0.7;

/**
 * Le radotage a deux planchers, pas un — les deux distributions ne se
 * ressemblent pas.
 *
 * Posés le 19 août 2026 sur le figé `2026-08-19-14h30.json` (claude-sonnet-5,
 * 27 dépôts, 176 concepts, 660 questions), à la lecture des listes des 50
 * paires les plus proches sur chaque axe. Le passage précédent — figé du
 * 18/08 — polluait la distribution inter avec 71 CLOZE porteuses d'une
 * consigne générique dans `question` ; la mesure comparait ces coquilles
 * entre elles. La dérivation de `question` à partir de `cloze.sentence`
 * dans `generate-variants.ts` a nettoyé la distribution, et c'est celle-ci
 * qui a servi à poser les seuils.
 *
 * **Pourquoi plus serrés que les filets des juges** : le radotage n'a pas
 * de juge derrière lui, les paires signalées se lisent directement. Ici la
 * précision prime sur le rappel — un filet large sans juge produit une
 * liste qu'on cesse de lire.
 *
 * **INTRA — questions d'un même Atom** : 0,87. Les Variants d'un même
 * concept tournent exprès pour ne pas laisser mémoriser une formulation ;
 * un seuil haut n'y signalera qu'un vrai clone. Décile d9 à 0,831,
 * queue supérieure entre 0,87 et 1,000 sur ce figé. Signalés attendus :
 * les deux paires de `12-borne-basse` (vinaigre/calcaire, un concept d'une
 * phrase où trois formats convergent — c'est la démonstration chiffrée du
 * « facettes optionnelles »), la paire du test du pli de peau de `21`
 * (MCQ et TRUE_FALSE qui posent la même question), les paires
 * intra-concept de `27` sur les tomates. Non signalé : la paire du méridien
 * de `19` (RECOGNITION vs BOUNDARY, la rotation de facettes fonctionne).
 *
 * **INTER — questions de concepts différents** : 0,80. Distribution plus
 * étalée (d9 à 0,638), un plancher trop haut raterait des idées vraiment
 * redondantes portées par deux concepts distincts. Signalés attendus :
 * les paires cross-concepts de `07-capture-assistant` autour du domaine
 * public Railway, la paire de `08` sur la symbiose du lichen, quelques
 * paires du corpus culinaire (`21` chat/eau, `16` casserole/inertie).
 */
export const PLANCHER_RADOTAGE_INTRA = 0.87;
export const PLANCHER_RADOTAGE_INTER = 0.8;
