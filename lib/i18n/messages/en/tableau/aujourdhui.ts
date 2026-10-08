import type { Messages } from "../../fr";

export const aujourdhui: Messages["tableau"]["aujourdhui"] = {
  titre: "Today",
  compteur: {
    rienDepose: "Nothing to review until you've dropped something in.",
    questionsEnRoute:
      "Your concepts are here, their questions are being written. Come back in a moment.",
    journeeFaite:
      "Your day is done: {nombre, plural, one {# concept reviewed} other {# concepts reviewed}}, the most for one day.",
    calme: "Nothing to review today. The next concepts will come back on their own.",
    aRevoir: "{nombre, plural, one {concept to review} other {concepts to review}} today.",
    enAttente:
      "{nombre} more {nombre, plural, one {is waiting its turn} other {are waiting their turn}}.",
    plafondParDefaut:
      "A session stops at {plafond} concepts, <lien>and you can change that</lien>.",
    plafondRegle:
      "You set your session to {plafond} concepts, <lien>and you can change it again</lien>.",
    reste: "The rest comes back tomorrow, starting with what's most at risk.",
    sansQuestions:
      "{nombre, plural, one {# concept is} other {# concepts are}} still waiting for questions. They're being written, and the concepts will join the session on their own.",
    commencer: "Start reviewing",
    entrainer: "Practice",
    entrainerAide: "Other questions on the same concepts. It doesn't change your schedule.",
    deposer: "Drop something in",
  },
  dette: {
    constat:
      "Your backlog hasn't gone down in {jours, plural, one {# day} other {# days}}: {enAttente, plural, one {# concept is} other {# concepts are}} waiting behind today's session.",
    auMaximum:
      "Your session is already at the maximum, {plafond} concepts a day. All that's left is to ease off on drops for a few days, until it comes back down.",
    deuxFacons:
      "Two ways to clear it: ease off on drops for a few days, or <lien>raise your session cap</lien>, currently {plafond} concepts a day.",
  },
  depots: {
    titre: "What you dropped in",
    toutVoir: "See all",
    videConstat: "You haven't dropped anything in yet.",
    videContexte:
      "A sentence, a pasted block of text, a screenshot — anything is a starting point.",
    capture: "Screenshot.",
    captureEnLecture: "Reading the screenshot",
    concepts: "{nombre, plural, one {# concept} other {# concepts}}",
  },
  cairn: {
    titre: "Your cairn",
    legendeVide: "The first concept you keep for good will lay the first stone.",
    legende:
      "{nombre, plural, one {# concept kept for good} other {# concepts kept for good}}. One stone each.",
    promesse:
      "One stone per concept you keep for good: when it comes back from far off and you get it three times in a row, or when you say you know it. Not when you've read it.",
    forme: "Each stone's shape comes from the concept it stands for. No one stacks the same ones.",
  },
  progression: {
    serie: "Streak",
    serieVide: "A session today starts your streak.",
    serieAide:
      "The number of sessions in a row, without missing one. A day when nothing is due doesn't count, and doesn't break anything.",
    serieUnite: "{nombre, plural, =1 {session} other {sessions in a row}}",
    niveau: "Level",
    niveauAide:
      "One point per question answered in a session, one more when you get back a concept you had missed. Being right doesn't factor in.",
    restant: "{restant} XP to level {suivant}",
  },
};
