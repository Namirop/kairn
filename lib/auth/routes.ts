/** Seule définition, lue par le proxy, la navigation et les redirections. */
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
  /** Les réglages du modèle, pas ceux du compte. */
  adminPilotage: "/admin/pilotage",
  /** L'ancienne adresse de l'écran interne, gardée le temps des favoris. */
  signalements: "/signalements",
} as const;

/** Où l'utilisateur voulait aller avant la connexion. */
export const PARAMETRE_DE_SUITE = "suite";
