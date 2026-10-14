import { z } from "zod";

/**
 * Le catalogue OpenRouter (`/models`), gratuit et sans effet de bord. La
 * campagne y vérifie au démarrage que ses modèles existent au bon prix, et
 * `verifier-openrouter.ts` en tire la liste des challengers éligibles.
 */

const ADRESSE_DU_CATALOGUE = "https://openrouter.ai/api/v1/models";

const schemaDesPrix = z.object({
  prompt: z.string(),
  completion: z.string(),
});

const schemaDUnModele = z.object({
  id: z.string(),
  pricing: schemaDesPrix,
  supported_parameters: z.array(z.string()).optional(),
});

const schemaDuListing = z.object({
  data: z.array(schemaDUnModele),
});

const PARAMETRES_DE_SORTIE_STRUCTUREE = new Set(["structured_outputs", "response_format"]);

export type EntreeDuCatalogue = {
  id: string;
  fournisseur: string;
  prixInParM: number;
  prixOutParM: number;
  supporteSortiesStructurees: boolean;
};

export async function lireLeCatalogue(): Promise<EntreeDuCatalogue[]> {
  const reponse = await fetch(ADRESSE_DU_CATALOGUE, {
    headers: { "Content-Type": "application/json" },
  });
  if (!reponse.ok) {
    throw new Error(
      `Impossible de lire le catalogue OpenRouter — statut ${reponse.status} ${reponse.statusText}`,
    );
  }
  const brut: unknown = await reponse.json();
  const lecture = schemaDuListing.safeParse(brut);
  if (!lecture.success) {
    throw new Error(`Le catalogue OpenRouter n'a pas la forme attendue : ${lecture.error.message}`);
  }

  return lecture.data.data.map((entree) => {
    const parametres = new Set(entree.supported_parameters ?? []);
    const supporteSortiesStructurees = [...parametres].some((p) =>
      PARAMETRES_DE_SORTIE_STRUCTUREE.has(p),
    );
    const [fournisseur = ""] = entree.id.split("/");
    return {
      id: entree.id,
      fournisseur,
      // Le listing donne un prix par token, en chaîne : ramené au million.
      prixInParM: Number.parseFloat(entree.pricing.prompt) * 1_000_000,
      prixOutParM: Number.parseFloat(entree.pricing.completion) * 1_000_000,
      supporteSortiesStructurees,
    };
  });
}
