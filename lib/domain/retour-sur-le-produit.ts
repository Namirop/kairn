/**
 * Ce qu'on accepte d'un retour sur le produit. Seul le message est obligatoire :
 * chaque champ imposé fait renoncer des gens. Les bornes ne jugent pas la
 * qualité : ce texte libre est lu dans un écran d'administration.
 */

/** Laisse passer « ça bug », arrête une frappe accidentelle. */
export const MESSAGE_MIN = 10;

/** Au-delà, ce n'est plus un retour : c'est un fil de discussion. */
export const MESSAGE_MAX = 2000;

/** Le nom d'un écran, pas le récit de ce qu'on y faisait. */
export const ECRAN_MAX = 120;

/** Sur vingt-quatre heures glissantes : assez pour tester, trop peu pour un script. */
export const RETOURS_PAR_JOUR = 20;

export function peutEncoreEnvoyer(dejaEnvoyes: number): boolean {
  return dejaEnvoyes < RETOURS_PAR_JOUR;
}

export function lireLeMessage(saisie: string): string | null {
  const propre = saisie.trim();

  if (propre.length < MESSAGE_MIN || propre.length > MESSAGE_MAX) return null;

  return propre;
}

export function lireLEcran(saisie: string): string | null {
  const propre = saisie.trim();

  return propre.length === 0 ? null : propre.slice(0, ECRAN_MAX);
}

/** De quoi reproduire un défaut d'affichage, et aucune donnée personnelle. */
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
