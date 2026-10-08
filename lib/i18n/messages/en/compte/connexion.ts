import type { Messages } from "../../fr";

export const connexion: Messages["compte"]["connexion"] = {
  metaTitre: "Sign in",
  titre: "Sign in to Kairn",
  ou: "or",
  consentement:
    "By continuing, you accept the <lien>privacy policy</lien>. Kairn emails you on days when something is due for review, and turns off in one click.",
  google: "Continue with Google",
  adresse: "Email address",
  envoi: "Sending…",
  recevoir: "Send me a code",
  mecanisme:
    "The code you get by email signs you in, and creates your account if you don't have one.",
  echecEnvoi: "The code couldn't be sent. Try again in a moment.",
  changerDAdresse: "Use a different address",
  code: {
    intitule: "{longueur}-digit code",
    coller: "Paste the code",
    verification: "Checking…",
    entrer: "Sign in",
    envoyeA: "Sent to {adresse}.",
    renvoyeA: "A new code is on its way to {adresse}.",
    expire: "It expires in ten minutes.",
    renvoyer: "Send a new code",
    tropDEssais: "Too many attempts on this code. Ask for a new one.",
    invalide: "This code doesn't match, or it has expired.",
    echecRenvoi: "The code couldn't be sent again. Try again in a moment.",
  },
  deconnexion: {
    bouton: "Sign out",
    enCours: "Signing out…",
  },
  desinscription: {
    fait: "Done. You won't get any more emails from Kairn.",
    enCours: "Working…",
    confirmer: "Confirm",
    echec: "Unsubscribing didn't go through. Try again, or turn off reminders from your settings.",
  },
};
