/**
 * Les chemins de l'application, nommés du point de vue de l'utilisateur.
 * Un seul endroit les définit : le middleware, la navigation et les
 * redirections lisent tous cette liste.
 */
export const ROUTES = {
  accueil: "/",
  connexion: "/connexion",
  inscription: "/inscription",
  aujourdhui: "/aujourdhui",
  depots: "/depots",
  reglages: "/reglages",
} as const;

/** Chemins qui exigent une session. */
export const PROTECTED_PATHS = [ROUTES.aujourdhui, ROUTES.depots, ROUTES.reglages] as const;

/** Paramètre qui mémorise où l'utilisateur voulait aller avant la connexion. */
export const RETURN_TO_PARAM = "suite";
