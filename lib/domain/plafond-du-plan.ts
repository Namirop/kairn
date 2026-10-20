/** Ce qu'un plan ouvre comme plafond de concepts, et quand il cesse de l'ouvrir. */

/** `lib/domain/` n'importe pas Prisma : tenu aligné à la main sur `enum PlanCompte`. */
export type Plan = "GRATUIT" | "MENSUEL" | "ANNUEL";

/**
 * Plafond commercial, pas de coût. Égal à `PLAFOND_CONCEPTS_PAR_DEPOT`, pour
 * qu'un dépôt seul ne dépasse pas le mois gratuit : les deux se changent ensemble.
 */
export const PLAFOND_GRATUIT = 50;

/** Mensuel comme annuel : les deux ne diffèrent que par leur cadence. */
export const PLAFOND_PAYANT = 500;

/** `finDePeriode` est nul sur un compte qui n'a jamais payé. */
export type Abonnement = {
  plan: Plan;
  finDePeriode: Date | null;
};

export const SANS_ABONNEMENT: Abonnement = { plan: "GRATUIT", finDePeriode: null };

/**
 * Un plan payant échu vaut gratuit : le droit s'éteint seul, sans tâche de fond.
 * Sans date (webhook incomplet) aussi : accorder ouvrirait un droit que rien
 * n'éteindrait, refuser produit une réclamation réparable. La borne est exclue,
 * comme la fin de `PeriodeDeQuota`.
 */
export function planEffectif(abonnement: Abonnement, maintenant: Date): Plan {
  if (abonnement.plan === "GRATUIT") return "GRATUIT";
  if (abonnement.finDePeriode === null) return "GRATUIT";
  if (maintenant.getTime() >= abonnement.finDePeriode.getTime()) return "GRATUIT";

  return abonnement.plan;
}

export function plafondDeConcepts(abonnement: Abonnement, maintenant: Date): number {
  return planEffectif(abonnement, maintenant) === "GRATUIT" ? PLAFOND_GRATUIT : PLAFOND_PAYANT;
}

/**
 * Un dépôt rejeté paie son extraction sans rendre de concept, d'où ce plafond ;
 * il suit le plan pour ne pas arrêter un compte payant avant le sien. Le double,
 * parce qu'un dépôt rend de un à cinquante concepts.
 */
export const DEPOTS_PAR_CONCEPT = 2;

export function plafondDeDepots(plafondDeConcepts: number): number {
  return plafondDeConcepts * DEPOTS_PAR_CONCEPT;
}
