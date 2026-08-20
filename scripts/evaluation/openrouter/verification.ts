import { lireLeCatalogue } from "./catalogue";
import type { ModeleOpenRouter } from "./modeles";

/**
 * Vérification du listing OpenRouter, à faire au démarrage de tout script de
 * campagne. Refuser tout de suite plutôt qu'au milieu d'un passage.
 *
 * Trois vérifications, chacune est un motif de refus :
 *
 * - le modèle existe : un identifiant tombé du listing depuis la fiche
 *   (fournisseur qui renomme, modèle retiré) empêche la campagne, autant le
 *   savoir tout de suite ;
 * - le modèle supporte les sorties structurées : sans elles, la grammaire ne
 *   contraint plus la génération, la mesure devient inhomogène. La fiche le
 *   dit : c'est un critère de sélection en amont, pas une correction en aval ;
 * - le prix du listing correspond au prix connu de la fiche à 5 % près : un
 *   écart plus grand signale que le catalogue a bougé sans qu'on l'ait vu, et
 *   les seuils de la règle §5 se lisent en pourcentages.
 *
 * L'endpoint `/models` d'OpenRouter est gratuit et documentaire — cette
 * vérification ne consomme pas de solde.
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
 * Renvoie la liste des modèles refusés — vide si tout va bien. Le script
 * appelant décide s'il s'arrête ou continue avec un sous-ensemble.
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
