import { lireLaVisite } from "@/lib/auth/visite";
import type { VariantFormat } from "@/lib/db/types";
import { lireLeDepotAnonyme } from "@/lib/db/depot-de-visite";
import { sessionDisponible } from "@/lib/db/essais-de-la-visite";

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
   * Les quatre questions écrites sur le premier concept **questionnable** —
   * l'échantillon de l'essai.
   *
   * Elles arrivent **après** les concepts : deux appels, deux temps. L'écran ne
   * les attend donc pas pour montrer ce qu'il a déjà, sans quoi l'ajout des
   * questions allongerait l'attente de tout le reste au lieu de l'enrichir.
   *
   * Elles peuvent aussi ne jamais venir : un dépôt factuel dont tous les
   * concepts sont incertains n'a rien à questionner, et l'écran s'arrête aux
   * concepts.
   */
  questions: { question: string; format: VariantFormat }[];
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
   * elle ne compte pas nos pannes. L'écran s'en sert pour ne proposer de déposer
   * à nouveau que quand le geste aboutira — un bouton qui promet ce que le
   * serveur refuse est pire que pas de bouton.
   *
   * Il se lit maintenant **aussi sur un essai réussi** : un découpage qui a
   * abouti ne ferme plus la visite, et la page doit pouvoir rouvrir le champ à
   * qui veut déposer autre chose.
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
    // Inutile de le demander tant que la chaîne tourne, et faux tant qu'elle
    // tourne : le dépôt en cours compte déjà comme un essai pris.
    peutRedeposer: arrete ? await sessionDisponible(visite) : false,
  };
}
