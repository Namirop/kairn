import type { SujetDeRetour } from "@/lib/db/types";

/** Du point de vue de qui rencontre le défaut, pas de qui le corrigera. */
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
