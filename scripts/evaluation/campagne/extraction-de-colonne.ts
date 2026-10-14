import type { SortieDExtraction } from "@/lib/ai/schemas";
import type { Depot } from "../corpus";
import type { ConceptFige, DepotFige } from "../fige";
import { BUDGET_SORTIE_CAMPAGNE } from "../openrouter/campagne";
import { extraireVia } from "../openrouter/extraction";
import type { ModeleOpenRouter } from "../openrouter/modeles";
import { ajouter, type FactureCumulee } from "./facture-cumulee";
import { motifCourt } from "./motif-court";

/** L'étape d'extraction d'une colonne : le challenger découpe chaque dépôt du corpus. */

export type ExtractionDeColonne = {
  figes: DepotFige[];
  echecs: Map<string, string>;
  /** Le dépôt après lequel le garde-fou 2× a coupé, `null` si l'étape est allée au bout. */
  arretApres: string | null;
};

function faireDepotFige(nom: string, texte: string, extraction: SortieDExtraction): DepotFige {
  const concepts: ConceptFige[] = extraction.atoms.map((atome) => ({
    concept: atome.concept,
    tags: atome.tags,
    uncertain: atome.uncertain,
  }));
  return {
    nom,
    texte,
    nature: extraction.nature,
    rejet: extraction.rejected,
    concepts,
  };
}

async function extraireUnDepot(
  challenger: ModeleOpenRouter,
  nom: string,
  texte: string,
  facture: FactureCumulee,
  echecs: Map<string, string>,
  loguer: (message: string) => void,
): Promise<DepotFige> {
  try {
    const { sortie, facture: appel } = await extraireVia(challenger, texte, BUDGET_SORTIE_CAMPAGNE);
    ajouter(appel, facture);
    loguer(
      `  ✓ ${nom} — ${sortie.atoms.length} concepts, ${(appel.coutUsd * 100).toFixed(2)} ¢ (cumul : ${facture.usd.toFixed(4)} $)`,
    );
    return faireDepotFige(nom, texte, sortie);
  } catch (erreur) {
    const motif = motifCourt(erreur);
    echecs.set(nom, motif);
    loguer(`  ✗ ${nom} — échec : ${motif.slice(0, 400)}`);
    return { nom, texte, rejet: null, concepts: [], echec: { motif } };
  }
}

export async function extraireLaColonne(
  challenger: ModeleOpenRouter,
  corpus: Depot[],
  textesDuFige: Map<string, string>,
  coutExtractionEstime: number,
  facture: FactureCumulee,
  loguer: (message: string) => void,
): Promise<ExtractionDeColonne> {
  const figes: DepotFige[] = [];
  const echecs = new Map<string, string>();

  for (let rang = 0; rang < corpus.length; rang++) {
    const depot = corpus[rang]!;
    // Le texte du figé quand il existe, OCR déjà fait : rejouer l'OCR par
    // challenger mesurerait autre chose que l'extraction.
    const texte = textesDuFige.get(depot.nom) ?? depot.texte;
    if (texte === "") {
      echecs.set(depot.nom, "texte vide : ni figé ni corpus n'ont fourni de contenu");
      figes.push({ nom: depot.nom, texte: "", rejet: null, concepts: [] });
      continue;
    }
    figes.push(await extraireUnDepot(challenger, depot.nom, texte, facture, echecs, loguer));
    // Ne coupe que s'il reste des dépôts : sur le dernier, le dépassement est
    // consommé, et priver la colonne de ses juges effacerait la mesure.
    const dernier = rang === corpus.length - 1;
    if (!dernier && facture.usd > 2 * coutExtractionEstime) {
      return { figes, echecs, arretApres: depot.nom };
    }
  }

  return { figes, echecs, arretApres: null };
}
