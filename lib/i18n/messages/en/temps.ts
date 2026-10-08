import type { Messages } from "../fr";

export const temps: Messages["temps"] = {
  delai:
    "{unite, select, jour {{nombre, plural, =0 {today} =1 {tomorrow} other {in # days}}} other {{nombre, plural, =1 {in a month} other {in # months}}}}",
  anciennete:
    "{unite, select, jour {{nombre, plural, =0 {today} =1 {yesterday} other {# days ago}}} other {{nombre, plural, =1 {a month ago} other {# months ago}}}}",
  remiseAZero:
    "{quand, select, instant {any moment now} jours {{nombre, plural, =1 {tomorrow} other {in # days}}} other {on {date}}}",
};
