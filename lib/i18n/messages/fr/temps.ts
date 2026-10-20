/**
 * Le palier jours/mois se décide dans le domaine (`lib/domain/echeance.ts`,
 * `remise-a-zero.ts`) ; ici on le dit. `nombre` vaut zéro pour aujourd'hui.
 */
export const temps = {
  delai:
    "{unite, select, jour {{nombre, plural, =0 {aujourd'hui} =1 {demain} other {dans # jours}}} other {{nombre, plural, =1 {dans un mois} other {dans # mois}}}}",
  anciennete:
    "{unite, select, jour {{nombre, plural, =0 {aujourd'hui} =1 {hier} other {il y a # jours}}} other {{nombre, plural, =1 {il y a un mois} other {il y a # mois}}}}",
  /** `date` arrive formatée dans la langue de la personne. */
  remiseAZero:
    "{quand, select, instant {d'un instant à l'autre} jours {{nombre, plural, =1 {demain} other {dans # jours}}} other {le {date}}}",
};
