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
  depotNouveau: "/depots/nouveau",
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

/**
 * Les écrans où l'on répond à des questions.
 *
 * Ils se passent de l'en-tête de l'application sur téléphone. Une session est
 * une tâche, pas une page qu'on parcourt : la marque et la pastille du compte
 * n'y servent à rien, elles prennent la hauteur qui manque au bas de l'écran, et
 * elles proposent de partir au moment précis où l'on demande de rester. Ce qui
 * nomme le passage et la porte pour en sortir tiennent déjà cette ligne, en
 * mieux — ils disent où l'on est et ce qu'on quitte.
 *
 * Au-delà de `md`, l'en-tête reste : la hauteur ne manque pas, et une fenêtre
 * de bureau sans sa barre supérieure a l'air d'avoir perdu quelque chose.
 */
export const ROUTES_DE_PASSAGE = [ROUTES.reviser, ROUTES.entrainement] as const;

/** Paramètre qui mémorise où l'utilisateur voulait aller avant la connexion. */
export const RETURN_TO_PARAM = "suite";
