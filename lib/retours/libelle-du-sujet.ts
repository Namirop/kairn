import type { SujetDeRetour } from "@/lib/db/types";

/**
 * Les libellés des sujets de retour pour l'exploitant (écran interne et email
 * d'alerte), en français. Le formulaire lit les siens dans
 * `compte.retour.sujets`. Ils disent la chose du point de vue de qui la
 * rencontre, pas de qui la corrigera.
 */
export const LIBELLE_DE_SUJET: Record<SujetDeRetour, string> = {
  // i18n-ignore — lu par l'écran interne et l'email d'alerte, en français ; le formulaire lit `compte.retour.sujets`
  BUG: "Ça ne marche pas",
  // i18n-ignore — lu par l'écran interne et l'email d'alerte, en français ; le formulaire lit `compte.retour.sujets`
  COMPORTEMENT: "Ça me surprend",
  // i18n-ignore — lu par l'écran interne et l'email d'alerte, en français ; le formulaire lit `compte.retour.sujets`
  TEXTE: "Un mot de travers",
  // i18n-ignore — lu par l'écran interne et l'email d'alerte, en français ; le formulaire lit `compte.retour.sujets`
  AUTRE: "Autre chose",
};
