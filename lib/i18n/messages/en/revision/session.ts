import type { Messages } from "../../fr";

export const session: Messages["revision"]["session"] = {
  intitule: "Session",
  arreterTitre: "Stop the session?",
  consequence: "What you just reviewed is saved. The rest comes back later, when it's due.",
  consequenceEnSuspens:
    "What you just reviewed is saved. The current question counts as not known: you saw its answer without rating yourself.",
  sortie: {
    arreterLa: "Stop here",
    reprendre: "Keep going",
    arreter: "Stop",
  },
  etat: {
    aujourdhui: "Today",
    serie: "{serie, plural, one {session} other {sessions in a row}}",
    concepts: "concepts",
    prochainRappel: "Next reminder",
    quandLeRappelTombe: "{jour, select, aujourdhui {today} other {tomorrow}}, {heureLue}",
  },
  serveur: {
    tropVite: "Too many answers in a row. Give it a few seconds.",
    expiree: "Your session has expired. Sign in again.",
    invalide: "This answer couldn't be saved.",
    introuvable: "This concept can't be found.",
  },
};
