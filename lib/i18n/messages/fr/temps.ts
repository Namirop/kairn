/**
 * Les délais et les dates, dits en phrase.
 *
 * Le palier — des jours, puis des mois — est décidé dans le domaine
 * (`lib/domain/echeance.ts`, `remise-a-zero.ts`) ; ici on ne fait que le dire.
 * `unite` vaut `jour` ou `mois`, `nombre` zéro pour aujourd'hui.
 */
export const temps = {
  delai:
    "{unite, select, jour {{nombre, plural, =0 {aujourd'hui} =1 {demain} other {dans # jours}}} other {{nombre, plural, =1 {dans un mois} other {dans # mois}}}}",
  anciennete:
    "{unite, select, jour {{nombre, plural, =0 {aujourd'hui} =1 {hier} other {il y a # jours}}} other {{nombre, plural, =1 {il y a un mois} other {il y a # mois}}}}",
  /** `date` arrive formatée, dans la langue de la personne. */
  remiseAZero:
    "{quand, select, instant {d'un instant à l'autre} jours {{nombre, plural, =1 {demain} other {dans # jours}}} other {le {date}}}",
};
