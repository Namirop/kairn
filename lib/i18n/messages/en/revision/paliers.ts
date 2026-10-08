import type { Messages } from "../../fr";

export const paliers: Messages["revision"]["paliers"] = {
  intituleSession: "Session",
  deposer: "Drop it in",
  deposerAutreChose: "Drop in something else",
  sentrainer: "Practice",
  retourAujourdhui: "Back to Today",
  entrainementLibre:
    "Practice asks other questions on the same concepts, without changing your schedule.",
  fin: {
    titre:
      "{revus, plural, =0 {Nothing reviewed} one {# concept reviewed} other {# concepts reviewed}}",
    demainRien:
      "Nothing comes back tomorrow: you're caught up. What you drop in next will come back in turn.",
    demain:
      "{nombre, plural, one {One concept comes back tomorrow.} other {# concepts come back tomorrow.}}",
    demainAvecRappel:
      "{nombre, plural, one {One concept comes back tomorrow, reminder at {heureLue}.} other {# concepts come back tomorrow, reminder at {heureLue}.}}",
    maitrise: "Known for good",
    maitrisePourquoi:
      "Three correct passes, each one faster. You no longer rebuild it, you know it.",
    espacement:
      "A session stops once it has served what was due. Each concept you recall comes back from further away — two days, then a week, then a month. It's the gap that makes it stick, not the repetition.",
  },
  rien: {
    journeeFaiteTitre: "You've done your day",
    journeeFaite:
      "{nombre, plural, one {# concept is waiting} other {# concepts are waiting}} for tomorrow. That's your session cap at work: what's left is still due, and it will come first.",
    videTitre: "Nothing to review yet",
    vide: "Kairn asks you again about what you give it. Drop in a first thing you want to keep, and it will come back on its own.",
    attenteTitre: "Your questions are on their way",
    attente:
      "Your concepts are broken out, and their questions are being written. They'll be here on your next visit.",
    voirDepots: "See what you dropped in",
    aJourTitre: "You're caught up",
    aJour: "Nothing to review today.",
    aJourProchain: "Nothing to review today. The next concept comes back {delai}.",
  },
};
