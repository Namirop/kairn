import { lireLeCatalogue } from "./catalogue";
import type { ModeleOpenRouter } from "./modeles";

/**
 * Vérification du listing OpenRouter au démarrage de tout script de campagne,
 * pour refuser avant le premier appel plutôt qu'au milieu d'un passage.
 * Trois motifs de refus :
 *
 * - le modèle a disparu du listing (renommé, retiré) ;
 * - il ne supporte pas les sorties structurées : la grammaire ne contraindrait
 *   plus la génération, et la mesure deviendrait inhomogène ;
 * - son prix s'écarte de plus de 5 % de celui épinglé : la règle de coût se lit
 *   en pourcentages.
 *
 * L'endpoint `/models` est gratuit : la vérification ne consomme pas de solde.
 */

const ECART_PRIX_TOLERE = 0.05;

function ecartRelatif(reel: number, attendu: number): number {
  if (attendu === 0) return reel === 0 ? 0 : Infinity;
  return Math.abs(reel - attendu) / attendu;
}

export type Refus = {
  modele: ModeleOpenRouter;
  motif: string;
};

/**
 * Les modèles refusés, vide si tout va bien. L'appelant décide s'il s'arrête
 * ou continue avec un sous-ensemble.
 */
export async function verifierLeListing(modeles: ModeleOpenRouter[]): Promise<Refus[]> {
  const catalogue = await lireLeCatalogue();
  const parId = new Map(catalogue.map((entree) => [entree.id, entree]));
  const refus: Refus[] = [];

  for (const modele of modeles) {
    const dansListing = parId.get(modele.id);
    if (!dansListing) {
      refus.push({ modele, motif: `identifiant ${modele.id} absent du listing OpenRouter` });
      continue;
    }
    if (!dansListing.supporteSortiesStructurees) {
      refus.push({
        modele,
        motif: `${modele.id} ne liste ni structured_outputs ni response_format dans supported_parameters`,
      });
      continue;
    }
    const ecartIn = ecartRelatif(dansListing.prixInParM, modele.prixInParM);
    const ecartOut = ecartRelatif(dansListing.prixOutParM, modele.prixOutParM);
    if (ecartIn > ECART_PRIX_TOLERE || ecartOut > ECART_PRIX_TOLERE) {
      refus.push({
        modele,
        motif: `prix catalogue divergent — listing : ${dansListing.prixInParM.toFixed(2)} $ / ${dansListing.prixOutParM.toFixed(2)} $ par million, fiche : ${modele.prixInParM} $ / ${modele.prixOutParM} $`,
      });
    }
  }

  return refus;
}
