/**
 * Ce qu'on accepte d'un retour sur le produit, et ce qu'on en garde.
 *
 * Le formulaire demande peu, et c'est délibéré : un retour qu'on n'écrit pas
 * vaut zéro, et tout champ obligatoire supplémentaire fait renoncer une partie
 * des gens. Il ne reste donc que le message. Le sujet est un choix parmi quatre,
 * l'écran et la capture sont facultatifs.
 *
 * Les bornes ne sont pas là pour la qualité du retour — un « ça marche pas » de
 * douze signes est un retour utile — mais pour que le champ ne devienne pas une
 * porte d'entrée : c'est du texte libre écrit par n'importe quel compte, et il
 * finit dans un écran d'administration.
 */

/**
 * En deçà, ce n'est pas un retour, c'est un clic.
 *
 * Dix signes laissent passer « ça bug » et arrêtent une frappe accidentelle.
 * On ne cherche pas à imposer une phrase : c'est le genre d'exigence qui fait
 * fermer l'écran.
 */
export const MESSAGE_MIN = 10;

/** Au-delà, ce n'est plus un retour : c'est un fil de discussion. */
export const MESSAGE_MAX = 2000;

/** Le nom d'un écran, pas le récit de ce qu'on y faisait. */
export const ECRAN_MAX = 120;

/**
 * Retours acceptés d'un même compte sur vingt-quatre heures glissantes.
 *
 * Assez haut pour qu'une session de test intensive ne bute jamais dedans — c'est
 * exactement le comportement qu'on veut encourager —, assez bas pour qu'un
 * script ne remplisse pas la table pendant la nuit.
 */
export const RETOURS_PAR_JOUR = 20;

export function peutEncoreEnvoyer(dejaEnvoyes: number): boolean {
  return dejaEnvoyes < RETOURS_PAR_JOUR;
}

/**
 * Le message, nettoyé, ou `null` s'il ne tient pas dans les bornes.
 *
 * Les espaces de bord ne comptent pas dans la mesure : une saisie de deux mots
 * suivie de trente retours à la ligne n'est pas un retour de trente-deux signes.
 */
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
 * Ce qui rend un défaut d'affichage reproductible, en une ligne.
 *
 * La largeur de la fenêtre d'abord, parce que c'est elle qui décide de tout ce
 * qui se casse sur téléphone, et c'est la chose qu'un rapport écrit à la main
 * n'inclut jamais. Le navigateur ensuite, coupé court : la chaîne complète est
 * illisible et ne dit rien de plus que son début.
 *
 * Ce n'est pas de la donnée personnelle et ça ne doit jamais le devenir : pas
 * d'adresse, pas de contenu déposé, pas d'identifiant. Deux nombres et un nom.
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
