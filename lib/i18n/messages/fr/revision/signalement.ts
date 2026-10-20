/** Les motifs disent ce que la personne pense en cliquant, pas ce que le système en fait. */
export const signalement = {
  declencheur: "Cette question ne va pas",
  titre: "Qu'est-ce qui ne va pas ?",
  description: "Elle ne te sera plus reposée. C'est lu, puis corrigé à la source.",
  motifs: {
    INCOMPREHENSIBLE: {
      libelle: "Je ne comprends pas la question",
      aide: "Mal tournée, ambiguë, ou il manque un bout.",
    },
    FAUSSE: {
      libelle: "La réponse attendue est fausse",
      aide: "Ce qu'elle affirme est inexact.",
    },
    HORS_SUJET: {
      libelle: "Sans rapport avec ce que j'ai déposé",
      aide: "Elle porte sur autre chose que mon texte.",
    },
    TROP_FACILE: {
      libelle: "Trop facile pour mesurer quoi que ce soit",
      aide: "La réponse est dans la question.",
    },
  },
  preciser: "Préciser, si tu veux",
  annuler: "Annuler",
  envoi: "Envoi…",
  envoyer: "Envoyer",
  merci: "Signalé. Cette question ne reviendra pas.",
};
