import { lireLaVisite } from "@/lib/auth/visite";
import { lireLeDepotAnonyme, type QuestionDeVitrine } from "@/lib/db/depot-de-visite";
import { sessionDisponible } from "@/lib/db/essais-de-la-visite";

/**
 * Lu au chargement de la landing aussi : un visiteur qui revient retrouve ses
 * concepts, et « crée un compte pour les garder » désigne quelque chose de visible.
 */

export type AvancementDeLEssai = {
  enCours: boolean;
  concepts: { id: string; concept: string; tags: string[] }[];
  /**
   * L'échantillon, d'un second appel : peut ne jamais venir si tous les concepts
   * sont incertains, l'écran ne l'attend pas.
   */
  questions: QuestionDeVitrine[];
  motifDechec: string | null;
  /** De nous, pas du texte : une panne ne demande rien, un rejet invite à redéposer. */
  panne: boolean;
  /** Lu en base, qui ne compte pas nos pannes : ne propose que ce que le serveur acceptera. */
  peutRedeposer: boolean;
};

function estArrete(statut: string): boolean {
  return statut === "READY" || statut === "REJECTED" || statut === "FAILED";
}

export async function lireLEssaiEnCours(): Promise<AvancementDeLEssai | null> {
  const visite = await lireLaVisite();

  if (!visite) return null;

  const depot = await lireLeDepotAnonyme(visite);

  if (!depot) return null;

  const arrete = estArrete(depot.statut);
  const vide = depot.concepts.length === 0;

  return {
    enCours: !arrete,
    concepts: depot.concepts,
    questions: depot.questions,
    motifDechec: vide && arrete ? depot.motifDechec : null,
    panne: vide && depot.statut === "FAILED",
    // Le dépôt en cours compte déjà comme un essai pris.
    peutRedeposer: arrete ? await sessionDisponible(visite) : false,
  };
}
