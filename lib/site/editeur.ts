/**
 * Identité de l'éditeur, écrite une fois pour que les deux pages légales ne
 * divergent pas. Rien de secret : la loi oblige à la publier.
 */

export const EDITEUR = {
  // i18n-ignore — un nom propre, le même dans toutes les langues.
  nom: "Romain Maes",

  /** Obligatoire sur tout document professionnel (loi du 14 février 2022). */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  mentionEI: "Entrepreneur individuel (EI)",

  /** Le statut, pas le régime : « micro-entrepreneur » seul laisse le statut vide. */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  statut: "Entrepreneur individuel relevant du régime de la micro-entreprise",

  // i18n-ignore — une adresse postale ne se traduit pas.
  adresse: "63 rue Jules Ferry, 59115 Leers, France",
  siren: "941 599 383",

  /** Exigé pour un service en ligne professionnel. Espaces insécables. */
  telephone: "06 40 53 38 45",

  /**
   * Franchise en base : pas de numéro, la mention du 293 B. À revoir au-delà de
   * 37 500 € de prestations (41 250 € en seuil majoré).
   */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  tva: "TVA non applicable, article 293 B du Code général des impôts.",

  /**
   * Relecture annuelle des engagements des sous-traitants, pas une date de
   * publication. Minuit UTC, formatée en UTC : un jour, pas un instant.
   */
  verifieLe: new Date("2026-08-24T00:00:00Z"),
} as const;

/** La date de vérification, dite dans la langue de la page : « 24 août 2026 ». */
export function dateDeVerification(etiquetteIntl: string): string {
  return new Intl.DateTimeFormat(etiquetteIntl, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(EDITEUR.verifieLe);
}

/** Unique, données comprises : une demande d'accès qui rebondit sur un alias est un manquement. */
export const CONTACT = {
  email: "contact@kairn.me",
} as const;

/** La politique de confidentialité doit dire où réclamer. Relevée sur cnil.fr. */
export const AUTORITE = {
  // i18n-ignore — nom officiel de l'autorité ; la version anglaise le présente dans ses messages.
  nom: "Commission nationale de l'informatique et des libertés (CNIL)",
  // i18n-ignore — une adresse postale ne se traduit pas.
  adresse: "3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07",
  telephone: "01 53 73 22 22",
  site: "www.cnil.fr",
} as const;
