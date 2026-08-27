import { lireLaVisite } from "@/lib/auth/visite";
import { lireLeDepotAnonyme } from "@/lib/db/depot-de-visite";
import { sessionDisponible } from "@/lib/db/session-anonyme";

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
  /**
   * La question écrite sur le premier concept **questionnable** — l'échantillon
   * de l'essai.
   *
   * Elle arrive **après** les concepts : deux appels, deux temps. L'écran ne
   * l'attend donc pas pour montrer ce qu'il a déjà, sans quoi l'ajout de la
   * question allongerait l'attente de tout le reste au lieu de l'enrichir.
   *
   * Elle peut aussi ne jamais venir : un dépôt factuel dont tous les concepts
   * sont incertains n'a rien à questionner, et l'écran s'arrête aux concepts.
   */
  question: string | null;
  /** Renseigné quand la chaîne s'est arrêtée sans rien produire. */
  motifDechec: string | null;
  /**
   * L'arrêt vient de nous et non du texte déposé.
   *
   * Les deux ne se disent pas de la même façon : un rejet demande de retenter
   * avec autre chose, une panne ne demande rien du tout à qui n'y est pour rien.
   */
  panne: boolean;
  /**
   * La visite garde-t-elle de quoi retenter ?
   *
   * Lu ici plutôt que déduit du nombre de concepts : c'est la base qui décide, et
   * elle ne compte pas nos pannes. L'écran s'en sert pour ne montrer « Réessayer »
   * que quand le geste aboutira — un bouton qui promet ce que le serveur refuse
   * est pire que pas de bouton.
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
    question: depot.question,
    motifDechec: vide && arrete ? depot.motifDechec : null,
    panne: vide && depot.statut === "FAILED",
    // Inutile de le demander tant que la chaîne tourne, et faux tant qu'elle
    // tourne : le dépôt en cours compte déjà comme un essai pris.
    peutRedeposer: vide && arrete ? await sessionDisponible(visite) : false,
  };
}
