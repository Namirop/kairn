import { lireLaVisite } from "@/lib/auth/visite";
import { lireLeDepotAnonyme, type QuestionDeVitrine } from "@/lib/db/depot-de-visite";
import { sessionDisponible } from "@/lib/db/essais-de-la-visite";

/**
 * Où en est l'essai de ce visiteur, s'il en a un. Lu au chargement de la landing
 * comme pendant l'attente : un visiteur qui revient retrouve ses concepts, et le
 * refus « crée un compte pour les garder » désigne quelque chose de visible.
 */

export type AvancementDeLEssai = {
  /** L'extraction tourne encore : l'écran attend, et le dit. */
  enCours: boolean;
  concepts: { id: string; concept: string; tags: string[] }[];
  /**
   * Les questions du premier concept questionnable, l'échantillon de l'essai.
   * Elles arrivent après les concepts (un second appel), et peuvent ne jamais
   * venir si tous les concepts sont incertains : l'écran ne les attend pas.
   */
  questions: QuestionDeVitrine[];
  /** Renseigné quand la chaîne s'est arrêtée sans rien produire. */
  motifDechec: string | null;
  /**
   * L'arrêt vient de nous, pas du texte : une panne ne demande rien au visiteur,
   * un rejet l'invite à déposer autre chose.
   */
  panne: boolean;
  /**
   * La visite garde-t-elle un essai, y compris après un découpage réussi ? Lu en
   * base (qui ne compte pas nos pannes) : l'écran ne propose de redéposer que si
   * le serveur l'acceptera.
   */
  peutRedeposer: boolean;
};

/** Les trois fins possibles d'une extraction. Tout le reste est en cours. */
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
    // Pendant le découpage, le dépôt en cours compte déjà comme un essai pris.
    peutRedeposer: arrete ? await sessionDisponible(visite) : false,
  };
}
