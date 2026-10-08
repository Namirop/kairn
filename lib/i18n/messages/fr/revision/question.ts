/**
 * La carte de question et ce qui se fait dessous : les formats, la correction,
 * la notation, les gestes qui portent sur le concept ou sur la question.
 *
 * Aucune de ces phrases ne félicite. Une bonne réponse se constate ; la
 * récompense est l'espacement qui s'allonge.
 */
export const question = {
  dernierPassage:
    "{jours, plural, =0 {Tu l'as vu aujourd'hui.} =1 {Tu l'as vu hier.} other {Tu l'as vu il y a # jours.}}",
  laReponse: "La réponse",
  pourquoi: "Pourquoi",
  terminer: "Terminer",
  continuer: "Continuer",
  tempsDeLire: "Le temps de la lire.",
  /** Muet à l'écran : ce qu'un lecteur d'écran entend du verdict. */
  verdict: {
    juste: "Réponse juste.",
    faux: "Réponse fausse.",
    bonneOption: "Bonne réponse.",
    choixFaux: "Ton choix, faux.",
  },
  jeterLaPierre: "Je jette la pierre",
  nonRetrouve: "Noté comme non retrouvé.",
  ouverte: {
    consigne: "Formule ta réponse d'abord, même de tête.",
    voir: "Voir la réponse",
    raison: "C'est l'effort de la retrouver qui la fixe.",
  },
  cloze: {
    termeAttendu: "C'est le terme attendu.",
    aide: "Retrouvé avec un coup de pouce : le concept revient un peu plus tôt.",
    /** `<terme>` met en chasse fixe ce qui a été tapé. */
    tuAsEcrit: "Tu as écrit <terme>{saisie}</terme>.",
    jeLAvais: "Je l'avais",
    jeNeLAvaisPas: "Je ne l'avais pas",
    consigne: "Complète avec le terme qui manque",
    verifier: "Vérifier",
    jeSeche: "Je sèche",
    pistes: "L'un de ces termes",
    rappelAide: "Compté comme un rappel aidé : le concept revient un peu plus tôt.",
  },
  /** Une graduation, dite du point de vue de celui qui se juge. Aucun n'est une note. */
  notation: {
    question: "Où en étais-tu ?",
    AGAIN: "Je ne l'avais pas",
    HARD: "Approchant",
    GOOD: "J'y étais",
    EASY: "Sans hésiter",
    oublie: "Oublié",
    immediat: "Immédiat",
  },
  maitrise: {
    geste: "Je maîtrise ça",
    precision: "Le concept revient dans trois mois pour vérifier, et ça se défait.",
    sorti: "<fort>Sorti du cycle</fort>, il reviendra dans trois mois.",
    annuler: "Annuler",
  },
  erreurPassage: "Ce passage n'a pas pu être enregistré. Réessaie.",
};
