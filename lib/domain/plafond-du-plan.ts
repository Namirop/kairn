/**
 * Ce qu'un plan ouvre comme plafond de concepts, et quand il cesse de l'ouvrir.
 * C'est le seul endroit où cette règle vit.
 *
 * `lib/domain/` n'importe pas Prisma : le plan est redéclaré ici et tenu aligné
 * à la main sur `enum PlanCompte`.
 */

/** Aligné sur `enum PlanCompte` du schéma. */
export type Plan = "GRATUIT" | "MENSUEL" | "ANNUEL";

/**
 * Ce qu'un compte gratuit retient par période. Plafond commercial, pas de coût.
 *
 * Égal à `PLAFOND_CONCEPTS_PAR_DEPOT` : un dépôt ne peut pas, à lui seul,
 * dépasser le mois d'un compte gratuit. Les deux valeurs se changent ensemble.
 */
export const PLAFOND_GRATUIT = 50;

/** Le plan payant, mensuel comme annuel : les deux ne diffèrent que par leur cadence. */
export const PLAFOND_PAYANT = 500;

/**
 * L'abonnement réduit à ce qui décide du plafond. `finDePeriode` est un instant,
 * comparé en UTC ; nul sur un compte qui n'a jamais payé.
 */
export type Abonnement = {
  plan: Plan;
  finDePeriode: Date | null;
};

/** L'absence de ligne d'abonnement vaut gratuit. */
export const SANS_ABONNEMENT: Abonnement = { plan: "GRATUIT", finDePeriode: null };

/**
 * Le plan qui vaut réellement à cet instant.
 *
 * Un plan payant dont la date est passée vaut gratuit : le droit s'éteint seul,
 * sans attendre une tâche de fond qui pourrait tomber.
 *
 * Un plan payant sans date vaut gratuit aussi (webhook incomplet) : accorder
 * ouvrirait un droit que rien n'éteindrait ; refuser produit une réclamation,
 * bruyante et réparable.
 *
 * La borne est exclue, comme la fin de `PeriodeDeQuota`.
 */
export function planEffectif(abonnement: Abonnement, maintenant: Date): Plan {
  if (abonnement.plan === "GRATUIT") return "GRATUIT";
  if (abonnement.finDePeriode === null) return "GRATUIT";
  if (maintenant.getTime() >= abonnement.finDePeriode.getTime()) return "GRATUIT";

  return abonnement.plan;
}

/** Le plafond de concepts d'un compte, à cet instant. */
export function plafondDeConcepts(abonnement: Abonnement, maintenant: Date): number {
  return planEffectif(abonnement, maintenant) === "GRATUIT" ? PLAFOND_GRATUIT : PLAFOND_PAYANT;
}

/** Le compte paie-t-il, à cet instant ? */
export function estPayant(abonnement: Abonnement, maintenant: Date): boolean {
  return planEffectif(abonnement, maintenant) !== "GRATUIT";
}

/**
 * Combien de dépôts pour un plafond de concepts donné.
 *
 * Le rideau existe parce qu'un dépôt rejeté paie son extraction sans rendre de
 * concept. Il doit suivre le plan, sinon un compte payant serait arrêté bien
 * avant son plafond. Le double, parce qu'un dépôt rend de un à cinquante
 * concepts : de quoi couvrir les phrases courtes comme les articles denses.
 */
export const DEPOTS_PAR_CONCEPT = 2;

export function plafondDeDepots(plafondDeConcepts: number): number {
  return plafondDeConcepts * DEPOTS_PAR_CONCEPT;
}
