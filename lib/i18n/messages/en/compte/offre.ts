import type { Messages } from "../../fr";

/**
 * Premium n'est pas vendu en anglais : `achat` et `complete` ne s'affichent pas
 * dans cette langue, mais restent traduits pour qu'aucune clé ne manque.
 */
export const offre: Messages["compte"]["offre"] = {
  titre: "Your plan",
  complet: "Premium",
  gratuit: "Free",
  parMois: "{plafond} concepts a month",
  voirTarifs: "See pricing",
  etat: {
    arrete:
      "Your subscription is stopped. Access runs until {terme}, then you go back to the free plan. Nothing is deleted, ever.",
    paye: "Your payment went through. Your plan runs until {terme}.",
    renouvele: "Renews on {terme}. You can stop whenever you want.",
    enRoute:
      "Your payment went through. It takes a few seconds to get here — this screen updates on its own.",
    ferme: "Payment isn't open yet.",
    gratuit: "Everything Kairn can do is open. Only the volume is capped.",
  },
  indisponible: "Premium isn't available in English yet.",
  attente:
    "Stripe is taking longer than usual to confirm. Your payment isn't lost: reload the page in a moment, or write to us if your plan hasn't changed by tomorrow.",
  complete: {
    titre: "Premium",
    texte:
      "Over the same period as yours. Nothing else changes: what you dropped in, your streak, your cairn.",
  },
  achat: {
    mensuel: "Pay €{prix} a month",
    annuel: "Pay €{prix} a year",
    note: "A year costs ten months for twelve. You enter your card on Stripe.",
  },
  reprendre: "Resume subscription",
  arreter: "Stop renewal",
  portail: "Invoices and payment method",
  erreurs: {
    tropVite: "Too many requests in a row. Wait a few seconds.",
    sessionExpiree: "Your session has expired. Sign in again.",
    echec: "Payment couldn't open. Try again in a moment.",
    dejaAbonne: "Your subscription is already active. Reload the page to see where it stands.",
    portailFerme: "Your invoices can't open right now. Try again in a moment.",
    offreInconnue: "This plan doesn't exist.",
    gesteInconnu: "This action doesn't exist.",
    arretEchoue: "The stop couldn't be saved.",
    repriseEchouee: "The resume couldn't be saved.",
  },
};
