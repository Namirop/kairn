/**
 * Les chemins de l'application, nommés du point de vue de l'utilisateur.
 * Un seul endroit les définit : le middleware, la navigation et les
 * redirections lisent tous cette liste.
 */
export const ROUTES = {
  accueil: "/",
  mentionsLegales: "/mentions-legales",
  confidentialite: "/confidentialite",
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
  /**
   * Les réglages du modèle, et non ceux de l'utilisateur.
   *
   * « Pilotage » et pas « réglages » parce que le rail interne porte les deux :
   * ceux du produit, qui appartiennent à la personne, et ceux-ci, qui coupent
   * les appels et changent les plafonds. Deux entrées du même nom dans la même
   * navigation ne se distinguent pas.
   */
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
