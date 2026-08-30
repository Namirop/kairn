/**
 * L'état de maîtrise d'un concept.
 *
 * Une machine à états dérivée de données qu'on possède déjà : l'intervalle que
 * ts-fsrs vient de rendre, et la suite de notes du concept. Aucun appel modèle,
 * aucun calcul coûteux — un champ mis à jour à chaque passage.
 *
 * L'état ne pilote rien : c'est la carte ts-fsrs qui décide quand un concept
 * revient. Il ne sert qu'à dire où en est la personne.
 */

/** Bornes en jours, telles qu'annoncées à l'utilisateur. */
export const JOURS_AVANT_REVIEWING = 7;
export const JOURS_AVANT_CONSOLIDATION = 21;
/**
 * Trois mois : l'échéance que pose « je maîtrise ça ».
 *
 * Ce n'était pas seulement une échéance : un intervalle qui dépassait trois mois
 * archivait le concept de lui-même. On a retiré cette règle. Elle affichait
 * « sorti du cycle » sur un concept qui n'en était pas sorti — il revenait bien
 * en session à son échéance —, et cette étiquette mensongère servait ensuite à
 * décider ailleurs, notamment à écarter de l'entraînement ce qu'on sait le
 * mieux. `CONSOLIDATED` disait déjà « bien su ». `ARCHIVED` ne signifie plus
 * qu'une chose, et c'est ce qui le rend lisible : l'utilisateur l'a demandé.
 *
 * Six mois laissaient l'oubli faire son travail deux fois plutôt qu'une, et
 * surtout c'était une promesse qu'on n'ose pas afficher : « on te le repose
 * dans six mois » s'entend comme « on te le rend jamais ». Trois mois suffisent
 * à ce qu'oublier ait le temps de se produire, et ça se dit devant quelqu'un.
 */
export const JOURS_AVANT_ARCHIVAGE = 90;

/** Ce qu'il faut de réussites d'affilée pour consolider un concept espacé. */
export const REUSSITES_POUR_CONSOLIDER = 3;

export type EtatMaitrise = "LEARNING" | "REVIEWING" | "CONSOLIDATED" | "ARCHIVED";

/**
 * Les états qui valent une pierre au cairn.
 *
 * `ARCHIVED` en fait partie, et il a manqué. Le cairn ne comptait que
 * `CONSOLIDATED` : déclarer « je maîtrise ça » sortait donc le concept de l'état
 * compté, et **retirait sa pierre** — l'empilement rétrécissait au moment où
 * quelqu'un disait savoir le mieux. La pierre marque un concept devenu tien, et
 * l'archivage est une revendication plus forte que la consolidation, pas plus
 * faible.
 *
 * Défini ici, et pas dans les deux requêtes qui s'en servent : le compteur et
 * les graines du dessin doivent voir exactement le même ensemble, sans quoi la
 * hauteur du cairn et le nombre annoncé se contredisent.
 */
export const ETATS_QUI_POSENT_UNE_PIERRE: EtatMaitrise[] = ["CONSOLIDATED", "ARCHIVED"];

/** Notes de ts-fsrs, dans le vocabulaire de la base. */
export type Note = "AGAIN" | "HARD" | "GOOD" | "EASY";

/**
 * `AGAIN` seul vaut échec.
 *
 * `HARD` dit que la réponse est venue difficilement, pas qu'elle était fausse :
 * la compter comme un échec rendrait la consolidation presque inatteignable
 * pour quelqu'un d'honnête avec lui-même.
 */
export function estReussite(note: Note): boolean {
  return note !== "AGAIN";
}

/** Réussites d'affilée en partant du passage le plus récent. */
export function compterReussitesConsecutives(notes: readonly Note[]): number {
  let compte = 0;

  for (let rang = notes.length - 1; rang >= 0; rang -= 1) {
    const note = notes[rang];

    if (!note || !estReussite(note)) break;

    compte += 1;
  }

  return compte;
}

/**
 * L'état après un passage.
 *
 * `ARCHIVED` ne se pose que sur une déclaration de l'utilisateur — c'est le seul
 * état que le produit ne décide pas. Aucun intervalle, si long soit-il, ne sort
 * un concept du cycle : la thèse tient qu'on croit savoir et qu'on oublie, et
 * un concept bien su revient à son échéance comme les autres. Ce qu'il y avait
 * à dire de lui, `CONSOLIDATED` le dit déjà.
 *
 * Un concept espacé mais pas encore régulier reste en `REVIEWING` — la
 * consolidation demande les deux, la durée **et** la régularité.
 */
export function etatApresRevision(
  intervalleJours: number,
  reussitesConsecutives: number,
  archiveParUtilisateur: boolean,
): EtatMaitrise {
  if (archiveParUtilisateur) return "ARCHIVED";

  if (intervalleJours > JOURS_AVANT_CONSOLIDATION) {
    return reussitesConsecutives >= REUSSITES_POUR_CONSOLIDER ? "CONSOLIDATED" : "REVIEWING";
  }

  if (intervalleJours >= JOURS_AVANT_REVIEWING) return "REVIEWING";

  return "LEARNING";
}
