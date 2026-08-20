import { z } from "zod";

/**
 * Le catalogue OpenRouter, lu depuis l'endpoint documentaire `/models`.
 *
 * Gratuit et sans effet de bord — la campagne s'en sert au démarrage pour
 * vérifier que ses modèles existent au bon prix, et le helper `--lister` du
 * script de vérification s'en sert pour proposer une liste éligible depuis
 * laquelle le pilote désigne les challengers.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/models";

const pricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
});

const modeleListingSchema = z.object({
  id: z.string(),
  pricing: pricingSchema,
  supported_parameters: z.array(z.string()).optional(),
});

const listingSchema = z.object({
  data: z.array(modeleListingSchema),
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
  const reponse = await fetch(ENDPOINT, {
    headers: { "Content-Type": "application/json" },
  });
  if (!reponse.ok) {
    throw new Error(
      `Impossible de lire le catalogue OpenRouter — statut ${reponse.status} ${reponse.statusText}`,
    );
  }
  const brut: unknown = await reponse.json();
  const parse = listingSchema.safeParse(brut);
  if (!parse.success) {
    throw new Error(`Le catalogue OpenRouter n'a pas la forme attendue : ${parse.error.message}`);
  }

  return parse.data.data.map((entree) => {
    const parametres = new Set(entree.supported_parameters ?? []);
    const supporteSortiesStructurees = [...parametres].some((p) =>
      PARAMETRES_DE_SORTIE_STRUCTUREE.has(p),
    );
    const [fournisseur = ""] = entree.id.split("/");
    return {
      id: entree.id,
      fournisseur,
      // Prix rendus par million de tokens depuis le listing, en dollars. La
      // plateforme les rend par token en chaîne — on multiplie.
      prixInParM: Number.parseFloat(entree.pricing.prompt) * 1_000_000,
      prixOutParM: Number.parseFloat(entree.pricing.completion) * 1_000_000,
      supporteSortiesStructurees,
    };
  });
}
