import type { SujetDeRetour } from "@/lib/db/types";

/**
 * Ce que chaque sujet de retour dit, en toutes lettres.
 *
 * Trois endroits en avaient besoin — le formulaire, l'écran interne et l'email
 * d'alerte — et chacun l'écrivait de son côté. Trois listes pour une même
 * énumération, c'est trois occasions d'en oublier une le jour où un sujet
 * s'ajoute, et deux d'entre elles ne sont vues que par une seule personne.
 *
 * Les libellés disent la chose du point de vue de qui la rencontre, jamais celui
 * de qui la corrigera : personne ne se dit « je vais signaler un défaut de
 * comportement ».
 *
 * Sous `lib/retours/` et non sous `lib/domain/`, parce qu'il lit le type d'une
 * énumération du schéma. Le domaine est du TypeScript pur, et une table de
 * libellés n'y a rien à faire : ce n'est pas une règle du produit, c'est ce
 * qu'on écrit à l'écran.
 *
 * **Il ne sert plus le formulaire**, qui lit ses libellés dans les messages
 * (`compte.retour.sujets`) pour parler la langue de qui écrit. Restent l'écran
 * interne et l'email d'alerte, qui sont lus par l'exploitant, en français.
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
