/**
 * Combien de concepts jamais vus la session du jour accepte.
 *
 * Un concept jamais revu a une urgence infinie (`retardRelatif`) et une
 * échéance posée au dépôt : sans cette borne, un gros dépôt remplit la session
 * de neuf pendant des jours et repousse tout ce qu'on révisait déjà. Le
 * plafond de session borne le total, pas l'entrée.
 *
 * La part est une proportion parce que le plafond se règle de 5 à 50. Le neuf
 * prend aussi les places que la révision laisse, sinon un compte neuf aurait
 * une session à moitié vide. Le total servi ne change pas, seule la
 * composition change.
 *
 * Trois régimes : rien ne presse, le neuf prend tout ; la révision se
 * bouscule, il garde sa part ; l'arriéré décroche, il n'a plus rien
 * (`ARRIERE_QUI_FERME`).
 */

/**
 * La part de la session ouverte au neuf quand la révision se bouscule : un
 * dépôt de cinquante concepts entre en une semaine et demie, et la majorité
 * des places reste à ce qui est en train d'être oublié.
 */
export const PART_NEUVE = 0.4;

/**
 * L'arriéré à partir duquel l'entrée se ferme, en journées de session.
 *
 * La garantie de `PART_NEUVE` tient pour une rafale, pas pour un débit : un
 * concept neuf coûte environ quatre passages le premier mois, donc huit
 * entrées par jour donnent une trentaine de révisions quotidiennes pour un
 * plafond à vingt, et l'arriéré ne se résorbe jamais. Au-delà du seuil la
 * garantie tombe ; l'entrée repart quand l'arriéré repasse dessous.
 *
 * Deux et pas une : une seule mauvaise journée ne doit pas fermer l'entrée.
 */
export const ARRIERE_QUI_FERME = 2;

/**
 * Les places que le neuf peut prendre : le maximum de sa part garantie et de
 * ce que la révision laisse.
 *
 * Au moins une place, car une part arrondie à zéro arrêterait l'introduction
 * pour toujours, sauf quand l'arriéré passe le seuil : c'est délibéré.
 */
export function placesPourLeNeuf(plafond: number, revusDisponibles: number): number {
  const borne = Math.max(0, plafond);

  if (borne === 0) return 0;

  const arriere = Math.max(0, revusDisponibles);
  const garantie =
    arriere > ARRIERE_QUI_FERME * borne ? 0 : Math.max(1, Math.round(borne * PART_NEUVE));

  return Math.max(garantie, borne - arriere);
}

/**
 * Ce que la session retient, la part de neuf bornée.
 *
 * Les candidats arrivent triés par urgence et l'ordre est conservé : ce module
 * choisit qui passe, pas dans quel ordre. Le neuf prend ses places, la
 * révision remplit le reste.
 */
export function bornerLeNeuf<T extends { lastReview: Date | null }>(
  candidats: readonly T[],
  plafond: number,
): T[] {
  const borne = Math.max(0, plafond);

  if (candidats.length <= borne) return [...candidats];

  const neufs = candidats.filter((candidat) => candidat.lastReview === null);
  const revus = candidats.filter((candidat) => candidat.lastReview !== null);

  const retenus = new Set<T>(neufs.slice(0, placesPourLeNeuf(borne, revus.length)));

  for (const revu of revus) {
    if (retenus.size >= borne) break;

    retenus.add(revu);
  }

  return candidats.filter((candidat) => retenus.has(candidat));
}
