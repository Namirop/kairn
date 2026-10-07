/**
 * Les chemins de l'application, nommés du point de vue de l'utilisateur.
 * Un seul endroit les définit : le middleware, la navigation et les
 * redirections lisent tous cette liste.
 */
export const ROUTES = {
  accueil: "/",
  mentionsLegales: "/mentions-legales",
  confidentialite: "/confidentialite",
  tarifs: "/tarifs",
  connexion: "/connexion",
  inscription: "/inscription",
  aujourdhui: "/aujourdhui",
  reviser: "/reviser",
  entrainement: "/entrainement",
  depots: "/depots",
  reglages: "/reglages",
  commentCaMarche: "/comment-ca-marche",
  admin: "/admin",
  adminDepense: "/admin/depense",
  adminComptes: "/admin/comptes",
  adminContenu: "/admin/contenu",
  adminSignalements: "/admin/signalements",
  adminRetours: "/admin/retours",
  /** Les réglages du modèle : appels, plafonds, mode mock. Pas ceux du compte. */
  adminPilotage: "/admin/pilotage",
  /** L'ancienne adresse de l'écran interne, gardée le temps des favoris. */
  signalements: "/signalements",
} as const;

/** Chemins qui exigent une session. */
export const PROTECTED_PATHS = [
  ROUTES.aujourdhui,
  ROUTES.reviser,
  ROUTES.entrainement,
  ROUTES.depots,
  ROUTES.reglages,
  ROUTES.commentCaMarche,
  ROUTES.admin,
  ROUTES.signalements,
] as const;

/** Paramètre qui mémorise où l'utilisateur voulait aller avant la connexion. */
export const RETURN_TO_PARAM = "suite";
