import type { Messages } from "../../fr";

export const retour: Messages["compte"]["retour"] = {
  sujet: "What is it about",
  sujets: {
    BUG: "It doesn't work",
    COMPORTEMENT: "It surprises me",
    TEXTE: "A word that's off",
    AUTRE: "Something else",
  },
  envoye:
    "It's sent, and it gets read. You won't get a reply — but what you just wrote will end up fixed.",
  message: "What you ran into",
  messageExemple: "What you were doing, what you expected, what happened.",
  ecran: "Which screen, if you remember",
  ecranExemple: "The session, a drop, the home page…",
  unInstant: "One moment",
  envoyer: "Send",
  joindreCapture: "Attach a screenshot",
  changerCapture: "Change screenshot",
  retirerCapture: "Remove screenshot",
  erreurs: {
    sujet: "Choose what it's about before sending.",
    longueur: "Write between {min} and {max} characters. One sentence is enough.",
    image: "This image is over 4 MB. Crop it, or send your message without it.",
    plafond: "You've sent {nombre} messages today. Come back tomorrow — they get read.",
  },
};
