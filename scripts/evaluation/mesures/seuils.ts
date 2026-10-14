/**
 * Les planchers, lus sur le figé `2026-08-14-20h39.json` (26 dépôts, 286
 * segments, 123 concepts) dans l'espace `voyage-3.5-lite`, 1024 dimensions.
 * Ils ne valent que pour cet espace : changer `MODELE_EMBEDDING` (`espace.ts`)
 * les périme tous.
 *
 * Un plancher n'est pas un verdict mais un filet de candidats pour un juge.
 * Trop large coûte quelques centimes d'appels ; trop étroit coûte des manques
 * silencieux, le défaut le plus grave. En cas de doute, on élargit.
 */

/**
 * Couverture : sous ce plancher, une phrase du dépôt est candidate au manque.
 *
 * 0,55 et non le premier décile (0,50) : les deux phrases de `18-anglais` que le
 * concept unique ne couvre pas, le cas d'école du manque, sont à 0,518 et
 * 0,533. La bande 0,50–0,55 porte encore du substantiel (`22`, `23`, `24`).
 */
export const PLANCHER_COUVERTURE = 0.55;

/** Soutien : sous ce plancher, un concept est candidat à l'invention. Premier décile. */
export const PLANCHER_SOUTIEN = 0.75;

/**
 * Doublon : au-dessus de ce plancher, deux concepts sont candidats à la redite.
 * Le rappel prime, puisque le juge du doublon tranche derrière.
 *
 * 0,63 et non 0,70, pour prendre la paire concept-instance de `11` (0,637)
 * qu'aucun autre détecteur ne voit. Le coût est faible : le juge est appelé par
 * dépôt avec ses candidats groupés, et passer de 57 à 151 paires ajoute cinq
 * appels. Le rendement par bande (voir `BANDE_DU_DOUBLON`) dira s'il faut
 * resserrer ou sonder dessous.
 *
 * Limite connue : une paire concept-instance peut plafonner sous tout plancher
 * exploitable, et l'ablation ne la rattrape pas non plus (retirer un concept
 * redondant fait chuter la couverture autant qu'un concept distinct). Voir le
 * rapport d'ablation.
 */
export const PLANCHER_DOUBLON = 0.63;

/** La frontière des deux bandes de rendement du juge du doublon. */
export const BANDE_DU_DOUBLON = 0.7;

/**
 * Le radotage a deux planchers, les deux distributions ne se ressemblant pas.
 * Lus sur le figé `2026-08-19-14h30.json` (27 dépôts, 176 concepts, 660
 * questions), aux 50 paires les plus proches de chaque axe. Ce figé suppose
 * `question` dérivée de `cloze.sentence` pour les CLOZE : sans ça, des
 * consignes génériques identiques polluent la distribution inter.
 *
 * Plus serrés que les filets des juges parce qu'aucun juge ne suit : les paires
 * signalées se lisent directement, et une liste trop longue cesse d'être lue.
 *
 * INTRA (même Atom), 0,87 : les Variants tournent exprès, seul un vrai clone
 * doit sortir. d9 à 0,831. Attendus : `12-borne-basse`, le pli de peau de
 * `21`, les tomates de `27` ; non signalé, le méridien de `19`.
 *
 * INTER (concepts différents), 0,80 : distribution plus étalée (d9 à 0,638).
 * Attendus : `07-capture-assistant` (Railway), le lichen de `08`, `21` et `16`.
 */
export const PLANCHER_RADOTAGE_INTRA = 0.87;
export const PLANCHER_RADOTAGE_INTER = 0.8;
