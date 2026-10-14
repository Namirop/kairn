/**
 * L'identité de l'éditeur et les coordonnées publiées, écrites une fois pour
 * que les deux pages légales ne puissent pas diverger. Rien ici n'est un
 * secret : la loi oblige à les publier.
 */

export const EDITEUR = {
  // i18n-ignore — un nom propre, le même dans toutes les langues.
  nom: "Romain Maes",

  /**
   * Obligatoire sur tout document professionnel (loi du 14 février 2022) ;
   * l'omission est une contravention.
   */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  mentionEI: "Entrepreneur individuel (EI)",

  /**
   * Le statut, pas le régime. « Micro-entrepreneur » désigne le régime fiscal et
   * social ; écrit seul, il laisse le statut juridique vide.
   */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  statut: "Entrepreneur individuel relevant du régime de la micro-entreprise",

  // i18n-ignore — une adresse postale ne se traduit pas.
  adresse: "63 rue Jules Ferry, 59115 Leers, France",
  siren: "941 599 383",

  /**
   * Exigé par la loi pour un service en ligne édité à titre professionnel.
   * Espaces insécables : un numéro ne doit pas se couper en fin de ligne.
   */
  telephone: "06 40 53 38 45",

  /**
   * En franchise en base, pas de numéro de TVA : c'est la mention de l'article
   * 293 B qui est attendue. À revoir si l'activité dépasse les seuils (37 500 €
   * de prestations de services, 41 250 € en seuil majoré).
   */
  // i18n-ignore — mention de droit français, dite en français ; la version anglaise la traduit dans ses messages.
  tva: "TVA non applicable, article 293 B du Code général des impôts.",

  /**
   * La date de relecture des engagements des sous-traitants (identités et
   * adresses reprises de leurs documents juridiques), pas une date de
   * publication. À refaire une fois par an.
   *
   * Minuit UTC, formatée en UTC : c'est un jour, pas un instant.
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

/**
 * L'unique adresse de contact, y compris pour les signalements et les demandes
 * relatives aux données : n'annoncer aucun alias qui n'existe pas, une demande
 * d'accès qui rebondit est un manquement.
 */
export const CONTACT = {
  email: "contact@kairn.me",
} as const;

/**
 * L'autorité de contrôle compétente, relevée sur cnil.fr. La politique de
 * confidentialité doit dire où exercer le droit de réclamation.
 */
export const AUTORITE = {
  // i18n-ignore — nom officiel de l'autorité ; la version anglaise le présente dans ses messages.
  nom: "Commission nationale de l'informatique et des libertés (CNIL)",
  // i18n-ignore — une adresse postale ne se traduit pas.
  adresse: "3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07",
  telephone: "01 53 73 22 22",
  site: "www.cnil.fr",
} as const;
