/**
 * Ce qu'un plan ouvre comme plafond de concepts, et quand il cesse de l'ouvrir.
 *
 * Le plafond de la période était une constante. Il devient une fonction du plan
 * du compte, et c'est le seul endroit où cette règle vit : la base enregistre ce
 * que Stripe rapporte, l'écran affiche ce qu'on lui donne, et personne d'autre
 * ne décide de ce qu'un compte a le droit de retenir.
 *
 * Le plan est redéclaré ici plutôt qu'importé de Prisma — même convention que
 * `EtatMaitrise` : `lib/domain/` n'importe pas Prisma, et l'union se tient
 * alignée sur `enum PlanCompte` à la main. Le prix de la pureté est cette
 * duplication-là, et elle est petite.
 */

/** Aligné sur `enum PlanCompte` du schéma. */
export type Plan = "GRATUIT" | "MENSUEL" | "ANNUEL";

/**
 * Ce qu'un compte gratuit retient par période.
 *
 * Ce plafond n'est plus une contrainte de coût — une période saturée coûte
 * quelques centimes au tarif Luna. C'est un plafond commercial, et le monter est
 * une décision de prix qui ne met aucun budget en danger.
 */
export const PLAFOND_GRATUIT = 30;

/** Ce que le plan payant ouvre, mensuel comme annuel : les deux ne diffèrent que par leur cadence. */
export const PLAFOND_PAYANT = 300;

/**
 * L'abonnement tel que la base le garde, réduit à ce qui décide du plafond.
 *
 * `finDePeriode` est un instant, comparé en UTC comme toute échéance de ce
 * projet. Nul sur un compte qui n'a jamais payé.
 */
export type Abonnement = {
  plan: Plan;
  finDePeriode: Date | null;
};

/** L'absence de ligne d'abonnement vaut gratuit — c'est l'état de tout le monde au départ. */
export const SANS_ABONNEMENT: Abonnement = { plan: "GRATUIT", finDePeriode: null };

/**
 * Le plan qui vaut réellement à cet instant.
 *
 * Deux règles, et les deux sont des refus.
 *
 * **Un plan payant dont la date est passée vaut gratuit.** C'est ce qui fait
 * qu'aucune tâche de fond n'a à éteindre les abonnements finis : le droit
 * s'éteint tout seul à l'heure dite. Un droit qui attend un cron pour expirer
 * est un droit qui traîne le jour où le cron tombe — et ce projet vient
 * précisément d'en faire l'expérience.
 *
 * **Un plan payant sans date ne vaut pas payant non plus.** Cet état n'existe
 * que si un webhook a écrit le plan sans écrire son terme, c'est-à-dire jamais
 * en fonctionnement normal. Le sens de l'erreur est délibéré : accorder
 * ouvrirait un droit sans terme, que rien n'éteindrait jamais. Le refuser
 * produit une réclamation, qui est bruyante et se répare ; l'inverse est
 * silencieux et ne se répare pas.
 *
 * La borne est exclue : à l'instant exact de la fin, le plan a fini. Même
 * convention que `PeriodeDeQuota`, dont la fin est le premier jour d'après.
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

/**
 * Le compte paie-t-il, à cet instant ?
 *
 * Sert à l'écran, qui ne propose pas d'acheter à quelqu'un qui a déjà payé.
 */
export function estPayant(abonnement: Abonnement, maintenant: Date): boolean {
  return planEffectif(abonnement, maintenant) !== "GRATUIT";
}
