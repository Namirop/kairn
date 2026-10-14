import { attendusDuDepot, type CouvertureAttendu } from "../attendus";
import type { DepotFige } from "../fige";
import type { SignalementsDuDepot } from "../mesures/signalements";
import { jugerLesAttendus } from "./attendus";
import { cacheDuDepot, chargerCache, sauverCache } from "./cache";
import { appelsPour, jugerLesDoublons, type VerdictDoublon } from "./doublon";
import { jugerLaFidelite, type VerdictFidelite } from "./fidelite";
import { jugerLeResidu, type VerdictInvention, type VerdictManque } from "./residu";

/**
 * L'orchestration des juges sur les signalements d'un passage : le seul endroit
 * qui décide de l'ordre et de la granularité des appels.
 *
 * Granularité réglée sur ce qu'on paie : le doublon par lots de paires d'un
 * dépôt, le résidu en un appel par dépôt (manques et inventions partagent le
 * texte), la fidélité par concept (isolé exprès), les attendus par dépôt. Un
 * dépôt sans candidat ne fait pas d'appel.
 *
 * Séquentiel, pour lire les erreurs un appel après l'autre. Chaque verdict est
 * sauvé au cache aussitôt : une relance reprend où elle s'est arrêtée.
 */

export type VerdictsDuDepot = {
  nom: string;
  doublons: VerdictDoublon[];
  manques: VerdictManque[];
  inventions: VerdictInvention[];
  /** Un verdict par question, groupé par concept, dans l'ordre de `depot.concepts`. */
  fidelite: { concept: string; questions: VerdictFidelite[] }[];
  /** La couverture des attendus, avec le verdict du juge. Vide pour la plupart des dépôts. */
  attendus: CouvertureAttendu[];
};

/** Envoie les attendus au juge : la géométrie sélectionne, le juge tranche. */
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
 * Combien d'appels chaque juge fera sur ce corpus : le rapport dit ce qu'il va
 * dépenser avant d'émettre. Doit rester aligné sur la granularité de
 * `jugerLesSignalements`.
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
