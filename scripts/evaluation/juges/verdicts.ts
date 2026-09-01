import { attendusDuDepot, type CouvertureAttendu } from "../attendus";
import type { DepotFige } from "../fige";
import type { SignalementsDuDepot } from "../mesures/signalements";
import { jugerLesAttendus } from "./attendus";
import { cacheDuDepot, chargerCache, sauverCache } from "./cache";
import { appelsPour, jugerLesDoublons, type VerdictDoublon } from "./doublon";
import { jugerLaFidelite, type VerdictFidelite } from "./fidelite";
import { jugerLeResidu, type VerdictInvention, type VerdictManque } from "./residu";

/**
 * L'orchestration des trois juges sur les signalements d'un passage.
 *
 * Ce que gagne le regroupement : un seul endroit qui décide de l'ordre et de la
 * granularité des appels, un seul type qui aligne les verdicts sur les
 * candidats — le rapport ne fait plus que rendre ce qui lui arrive dans l'ordre.
 *
 * Trois choix, tous rapportés à ce qu'on paie : un appel par dépôt pour le
 * doublon (une paire par item, groupées), un appel par dépôt pour le résidu
 * (manques + inventions groupés parce qu'ils partagent le texte), un appel par
 * concept pour la fidélité (chaque concept est isolé exprès). Les dépôts sans
 * candidat ne font pas d'appel — voir la logique de chaque juge.
 *
 * L'itération est **séquentielle** : les paires prises deux à deux ne se
 * doublent pas de temps quand le corpus tient dans un passage complet en moins
 * d'une minute, et la lecture des journaux d'erreur est plus simple à un appel
 * après l'autre. Le jour où la latence devient un mur, on parallélisera par
 * lots — pas avant.
 */

export type VerdictsDuDepot = {
  nom: string;
  doublons: VerdictDoublon[];
  manques: VerdictManque[];
  inventions: VerdictInvention[];
  /**
   * Un verdict par question, groupé par concept, dans le même ordre que
   * `depot.concepts`. Vide tant qu'aucun figé ne porte de questions.
   */
  fidelite: { concept: string; questions: VerdictFidelite[] }[];
  /**
   * La couverture des attendus, avec verdict du juge pour ceux passés au
   * repli. Vide pour les dépôts sans attendus — la plupart.
   */
  attendus: CouvertureAttendu[];
};

/**
 * Envoie chaque attendu au juge — géométrie sélectionne, juge tranche. Un
 * appel par dépôt tant qu'il y a au moins un attendu ; le dépôt sans attendu
 * n'appelle rien.
 */
async function juger(nom: string, couvertures: CouvertureAttendu[]): Promise<CouvertureAttendu[]> {
  if (couvertures.length === 0) return [];

  const soumis = couvertures.map((c) => ({
    attendu: c.attendu,
    candidats: c.candidats.map((k) => k.concept),
  }));
  const verdicts = await jugerLesAttendus(nom, soumis);

  return couvertures.map((c, rang) => {
    const verdict = verdicts[rang];
    if (!verdict) throw new Error(`Verdict d'attendu manquant #${rang + 1} sur ${nom}.`);
    return { ...c, verdict };
  });
}

export async function jugerLesSignalements(
  signalements: SignalementsDuDepot[],
  depots: DepotFige[],
  couverturesInitiales: { nom: string; couvertures: CouvertureAttendu[] }[],
  cheminFige: string,
): Promise<VerdictsDuDepot[]> {
  const parNom = new Map(depots.map((depot) => [depot.nom, depot]));
  const couverturesParNom = new Map(couverturesInitiales.map((c) => [c.nom, c.couvertures]));
  const cache = chargerCache(cheminFige);
  const verdicts: VerdictsDuDepot[] = [];

  for (const signalement of signalements) {
    const depot = parNom.get(signalement.nom);

    if (!depot) {
      throw new Error(`Le juge n'a pas trouvé le dépôt « ${signalement.nom} » dans le figé.`);
    }

    const cacheDepot = cacheDuDepot(cache, depot.nom);

    if (cacheDepot.doublons === undefined) {
      cacheDepot.doublons = await jugerLesDoublons(depot.nom, signalement.doublons);
      sauverCache(cache, cheminFige);
    }

    if (cacheDepot.residu === undefined) {
      const rendu = await jugerLeResidu(
        depot.nom,
        depot.texte,
        signalement.manques,
        signalement.inventions,
      );
      cacheDepot.residu = { manques: rendu.manques, inventions: rendu.inventions };
      sauverCache(cache, cheminFige);
    }

    cacheDepot.fidelite ??= {};
    const fidelite: VerdictsDuDepot["fidelite"] = [];
    for (const concept of depot.concepts) {
      if (!concept.variants || concept.variants.length === 0) continue;

      let questions = cacheDepot.fidelite[concept.concept];
      if (questions === undefined) {
        questions = await jugerLaFidelite(concept.concept, concept.variants);
        cacheDepot.fidelite[concept.concept] = questions;
        sauverCache(cache, cheminFige);
      }
      fidelite.push({ concept: concept.concept, questions });
    }

    if (cacheDepot.attendus === undefined) {
      const couverturesBrutes = couverturesParNom.get(depot.nom) ?? [];
      cacheDepot.attendus = await juger(depot.nom, couverturesBrutes);
      sauverCache(cache, cheminFige);
    }

    verdicts.push({
      nom: depot.nom,
      doublons: cacheDepot.doublons,
      manques: cacheDepot.residu.manques,
      inventions: cacheDepot.residu.inventions,
      fidelite,
      attendus: cacheDepot.attendus,
    });
  }

  return verdicts;
}

/**
 * Combien d'appels chaque juge fera sur ce corpus.
 *
 * Sert au plan chiffré : le rapport ne part qu'après avoir dit ce qu'il va
 * dépenser, comme `eval:generation`. Le doublon compte par lot (voir la
 * constante dans `doublon.ts`), le résidu par dépôt signalé, la fidélité par
 * concept qui porte des questions.
 */
export function compterLesAppelsDesJuges(
  signalements: SignalementsDuDepot[],
  depots: DepotFige[],
): { doublon: number; residu: number; fidelite: number; attendus: number } {
  const parNom = new Map(depots.map((depot) => [depot.nom, depot]));
  let doublon = 0;
  let residu = 0;
  let fidelite = 0;
  let attendus = 0;

  for (const signalement of signalements) {
    doublon += appelsPour(signalement.doublons.length);
    if (signalement.manques.length + signalement.inventions.length > 0) residu += 1;

    const depot = parNom.get(signalement.nom);
    if (!depot) continue;

    for (const concept of depot.concepts) {
      if (concept.variants && concept.variants.length > 0) fidelite += 1;
    }

    if (attendusDuDepot(depot.nom).length > 0) attendus += 1;
  }

  return { doublon, residu, fidelite, attendus };
}
