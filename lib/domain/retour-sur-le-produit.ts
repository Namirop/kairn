/**
 * Ce qu'on accepte d'un retour sur le produit, et ce qu'on en garde.
 *
 * Seul le message est obligatoire : chaque champ imposé en plus fait renoncer
 * une partie des gens.
 *
 * Les bornes ne jugent pas la qualité du retour : elles empêchent que ce texte
 * libre, écrit par n'importe quel compte et lu dans un écran d'administration,
 * devienne une porte d'entrée.
 */

/** Laisse passer « ça bug », arrête une frappe accidentelle. */
export const MESSAGE_MIN = 10;

/** Au-delà, ce n'est plus un retour : c'est un fil de discussion. */
export const MESSAGE_MAX = 2000;

/** Le nom d'un écran, pas le récit de ce qu'on y faisait. */
export const ECRAN_MAX = 120;

/**
 * Retours acceptés d'un même compte sur vingt-quatre heures glissantes : assez
 * pour une session de test intensive, trop peu pour qu'un script remplisse la
 * table.
 */
export const RETOURS_PAR_JOUR = 20;

export function peutEncoreEnvoyer(dejaEnvoyes: number): boolean {
  return dejaEnvoyes < RETOURS_PAR_JOUR;
}

/** Le message sans ses espaces de bord, ou `null` s'il sort des bornes. */
export function lireLeMessage(saisie: string): string | null {
  const propre = saisie.trim();

  if (propre.length < MESSAGE_MIN || propre.length > MESSAGE_MAX) return null;

  return propre;
}

/** L'écran nommé, coupé à sa borne, ou `null` s'il n'a pas été rempli. */
export function lireLEcran(saisie: string): string | null {
  const propre = saisie.trim();

  return propre.length === 0 ? null : propre.slice(0, ECRAN_MAX);
}

/**
 * Ce qui rend un défaut d'affichage reproductible, en une ligne : la taille de
 * la fenêtre, puis le navigateur coupé court.
 *
 * Aucune donnée personnelle ne doit y entrer : ni adresse, ni contenu déposé,
 * ni identifiant.
 */
export function resumerLeContexte(largeur: number, hauteur: number, agent: string): string | null {
  const fenetre =
    Number.isFinite(largeur) && Number.isFinite(hauteur) && largeur > 0 && hauteur > 0
      ? `${Math.round(largeur)}×${Math.round(hauteur)}`
      : null;

  const navigateur = agent.trim().slice(0, 180);

  const parts = [fenetre, navigateur.length > 0 ? navigateur : null].filter(
    (part): part is string => part !== null,
  );

  return parts.length === 0 ? null : parts.join(" · ");
}
