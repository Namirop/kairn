import type { Messages } from "../fr";

export const emails: Messages["emails"] = {
  commun: {
    uniteDeSerie: "{nombre, plural, =1 {session} other {sessions in a row}}",
    commencer: "Start reviewing",
    deposer: "Drop it in",
    nePlusRecevoirEmails: "Stop receiving emails from Kairn: {url}",
  },
  pied: {
    raisonParDefaut:
      "You're receiving this because the daily reminder is turned on for your account.",
    nePlusEnRecevoir: "Stop receiving these",
  },
  accueil: {
    sujetPlein: "{nombre, plural, =1 {1 concept is} other {# concepts are}} waiting for you",
    sujetVide: "Your Kairn account is open",
    arrives:
      "{nombre, plural, =1 {1 concept} other {# concepts}} came in with you. Their questions are being written, and your first session is waiting.",
    ouvert: "Your account is open.",
    premierePierre:
      "It's waiting for its first stone. Drop in something you want to keep — a sentence you heard, a paragraph you copied, a screenshot. It doesn't have to be tidy or long.",
    decoupe:
      "Kairn breaks it into concepts, turns them into questions, and asks you again just as you're about to forget them.",
    raison: "You're receiving this because you just created a Kairn account.",
  },
  rappel: {
    sujet: "{nombre, plural, =1 {1 concept} other {# concepts}} to review today",
    echeance: "{nombre, plural, =1 {1 concept is} other {# concepts are}} due today.",
    serieTexte: "{nombre, plural, =1 {1 day} other {# days}} in a row.",
    nePlusRecevoir: "Stop this reminder: {url}",
  },
  serie: {
    sujet: "Your streak is at stake today",
    preheader: "{serie}, and nothing today.",
    constat:
      "Nothing has been reviewed today, and {nombre, plural, =1 {1 concept is} other {# concepts are}} waiting. A single question is enough to keep the streak.",
    nePlusRecevoir: "Stop this alert: {url}",
    raison: "You're receiving this because the streak alert is turned on for your account.",
  },
  relance: {
    sujet: "Your Kairn account is still empty",
    titre: "Nothing dropped in yet.",
    exemples:
      "Kairn works with whatever crosses your path: a recommendation someone gave you, a shortcut you relearn every month, three lines from an article. One thing is enough to start.",
    retour:
      "It becomes a few concepts, and they come back to you spaced out over time, just before you would have forgotten them.",
    preheader: "One thing is enough to start.",
    raison:
      "You're receiving this once, because your Kairn account has stayed empty since it was opened.",
  },
  code: {
    sujet: "{code} — your code to sign in to Kairn",
    preheader: "Your Kairn sign-in code: {code}",
    intro: "Here's your code to sign in to Kairn.",
    ligneCode: "Code: {code}",
    retape:
      "Type it into the window where you asked for it. It works only once and expires in {minutes} minutes.",
    ignore: "If you didn't ask for this code, ignore this message: no one can get in without it.",
    ignoreCourt: "If you didn't ask for this code, ignore this message.",
  },
};
