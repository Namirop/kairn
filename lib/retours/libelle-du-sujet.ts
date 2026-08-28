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
 */
export const LIBELLE_DE_SUJET: Record<SujetDeRetour, string> = {
  BUG: "Ça ne marche pas",
  COMPORTEMENT: "Ça me surprend",
  TEXTE: "Un mot de travers",
  AUTRE: "Autre chose",
};
