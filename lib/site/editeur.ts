/**
 * L'identité de l'éditeur, et les coordonnées qu'on publie.
 *
 * Écrites une fois. Les deux pages légales les répètent — c'est normal et c'est
 * attendu, une politique de confidentialité doit se lire seule — mais elles ne
 * doivent pas les **recopier** : le jour où l'adresse change, deux pages qui la
 * portent chacune de leur côté n'en changent qu'une, et c'est celle qui reste qui
 * fait foi aux yeux de qui la lit.
 *
 * Rien ici n'est un secret : ce sont des informations que la loi oblige à publier.
 */

export const EDITEUR = {
  nom: "Romain Maes",

  /**
   * Obligatoire depuis la loi du 14 février 2022, sur tous les documents
   * professionnels : le nom d'un entrepreneur individuel doit porter la mention
   * « entrepreneur individuel » ou « EI ». L'omission est une contravention.
   */
  mentionEI: "Entrepreneur individuel (EI)",

  /**
   * Le statut, pas le régime. « Micro-entrepreneur » désigne le régime fiscal et
   * social ; écrit seul, il laisse le statut juridique vide.
   */
  statut: "Entrepreneur individuel relevant du régime de la micro-entreprise",

  adresse: "63 rue Jules Ferry, 59115 Leers, France",
  siren: "941 599 383",

  /**
   * Exigé par la loi pour un service de communication au public en ligne édité à
   * titre professionnel, au même titre que l'adresse. Écrit avec des espaces
   * insécables : un numéro coupé en fin de ligne ne se recompose pas de tête.
   */
  telephone: "06 40 53 38 45",

  /**
   * En franchise en base, on n'affiche pas de numéro de TVA : l'obligation ne
   * vise que les assujettis, et publier un numéro qu'on n'utilise pas sème le
   * doute chez qui lit une facture. C'est la mention de l'article 293 B qui est
   * attendue à la place.
   *
   * Confirmé par Romain le 17 août 2026 : l'activité est sous les seuils. À
   * revoir si elle les dépasse — trente-sept mille cinq cents euros de
   * prestations de services, quarante et un mille deux cent cinquante en seuil
   * majoré.
   */
  tva: "TVA non applicable, article 293 B du Code général des impôts.",

  /**
   * La date à laquelle les engagements des sous-traitants ont été relus, et où
   * leurs identités et adresses ont été reprises de leurs propres documents
   * juridiques. Ce n'est pas une date de publication : c'est celle d'une
   * vérification, et c'est exactement le genre de mention qu'on peut demander de
   * justifier. À refaire une fois par an.
   */
  verifieLe: "24 août 2026",
} as const;

/**
 * L'adresse de contact, et elle seule.
 *
 * Une seule boîte pour tout — contact, signalements, demandes relatives aux
 * données. Annoncer trois alias dont deux n'existent pas serait promettre des
 * canaux qui rebondissent, et une demande d'accès qui rebondit est un manquement,
 * pas un détail de configuration.
 */
export const CONTACT = {
  email: "contact@kairn.me",
} as const;

/**
 * L'autorité de contrôle compétente. Coordonnées relevées sur cnil.fr.
 *
 * Elle doit figurer dans la politique de confidentialité : sans elle, le droit de
 * réclamation est mentionné sans qu'on sache où l'exercer.
 */
export const AUTORITE = {
  nom: "Commission nationale de l'informatique et des libertés (CNIL)",
  adresse: "3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07",
  telephone: "01 53 73 22 22",
  site: "www.cnil.fr",
} as const;
