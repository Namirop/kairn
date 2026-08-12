import { lireLaVisite } from "@/lib/auth/visite";
import { lireLeDepotAnonyme } from "@/lib/db/session-anonyme";

/**
 * Où en est l'essai de ce visiteur, s'il en a un.
 *
 * Lu au chargement de la landing autant qu'en cours d'attente, et par le même
 * chemin : quelqu'un qui revient une heure plus tard doit retrouver ses concepts
 * à l'écran, pas un champ vide. Sans ça, le refus d'un second essai — « crée un
 * compte pour garder ces concepts » — désigne quelque chose que personne ne voit,
 * ce qui le fait passer pour une erreur plutôt que pour une invitation.
 */

export type AvancementDeLEssai = {
  /** L'extraction tourne encore : l'écran attend, et le dit. */
  enCours: boolean;
  concepts: { id: string; concept: string; tags: string[] }[];
  /** Renseigné quand la chaîne s'est arrêtée sans rien produire. */
  motifDechec: string | null;
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

  return {
    enCours: !arrete,
    concepts: depot.concepts,
    motifDechec: depot.concepts.length === 0 && arrete ? depot.motifDechec : null,
  };
}
