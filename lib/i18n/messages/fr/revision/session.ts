/** La session du jour, et les réponses du serveur quand un passage ne s'écrit pas. */
export const session = {
  intitule: "Session",
  arreterTitre: "Arrêter la session ?",
  consequence:
    "Ce que tu viens de revoir est enregistré. Le reste revient plus tard, à son échéance.",
  consequenceEnSuspens:
    "Ce que tu viens de revoir est enregistré. La question en cours compte comme non sue : tu as vu sa réponse sans te noter.",
  sortie: {
    arreterLa: "Arrêter là",
    reprendre: "Reprendre",
    arreter: "Arrêter",
  },
  etat: {
    aujourdhui: "Aujourd'hui",
    /** Le nombre s'écrit à part, dans sa propre chasse. */
    serie: "{serie, plural, one {session} other {sessions d'affilée}}",
    concepts: "concepts",
    prochainRappel: "Prochain rappel",
    /** Reçoit `heure` (nombre seul, lu ici) et `heureLue` (formatée, lue en anglais). */
    quandLeRappelTombe: "{jour, select, aujourdhui {aujourd'hui} other {demain}}, {heure} h",
  },
  serveur: {
    tropVite: "Trop de réponses coup sur coup. Laisse passer quelques secondes.",
    expiree: "Ta session a expiré. Reconnecte-toi.",
    invalide: "Cette réponse n'a pas pu être enregistrée.",
    introuvable: "Ce concept est introuvable.",
  },
};
