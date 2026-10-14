/**
 * La landing hors de l'essai : l'ouverture, l'en-tête public, le sentier, le
 * panneau de roche et le pied de page.
 *
 * `--t-ouverture` est calibré sur la largeur de « Tu lis beaucoup. » : une
 * ligne d'ouverture plus longue, ici ou traduite, se remesure, sinon le titre
 * passe à la ligne.
 */
export const accueil = {
  hero: {
    constat: "Tu lis beaucoup.",
    retournement: "Tu retiens peu.",
    aujourdhui: "Aujourd'hui",
    essayer: "Essayer sans compte",
  },
  entete: {
    aujourdhui: "Aujourd'hui",
    seConnecter: "Se connecter",
  },
  pied: {
    devise: "Kairn — un cairn balise un sentier, une pierre à la fois.",
    tarifs: "Tarifs",
    mentionsLegales: "Mentions légales",
    confidentialite: "Confidentialité",
  },
  /** Le titre s'empile une ligne à la fois : chaque moitié est un bloc. */
  sentier: {
    titreHaut: "Trois gestes,",
    titreBas: "et c'est tout.",
    deposer: {
      titre: "Tu déposes",
      texte:
        "Rien à formater, rien à découper, rien à mettre en fiches : tu colles, et c'est fini. Même la photo d'une page de livre.",
    },
    decouper: {
      titre: "Kairn découpe",
      texte:
        "Le dépôt devient des concepts unitaires, chacun avec trois ou quatre façons d'être questionné : un terme à retrouver dans une phrase, un choix à faire, une explication à donner. La formulation tourne pour que tu retiennes l'idée, pas la phrase.",
    },
    revenir: {
      titre: "Ça revient",
      texte:
        "Chaque concept revient à l'instant où tu es sur le point de l'oublier. Plus tu le sais, plus il s'espace. Une pierre de plus au cairn quand il est acquis.",
    },
  },
  pasCeci: {
    titreHaut: "Ce que ce",
    titreBas: "n'est pas.",
    negations:
      "Ce n'est pas une application de fiches à écrire soi-même : ce qui use, ce n'est pas de réviser, c'est de fabriquer les cartes. Ce n'est pas un outil de prise de notes — tu en as déjà un, et ce n'est pas là que le savoir se fixe. Ce n'est pas un assistant à qui parler.",
    affirmation:
      "C'est une seule chose : ce que tu as lu revient au bon moment, jusqu'à ce que ce soit à toi.",
    aujourdhui: "Aujourd'hui",
    creerCompte: "Créer mon compte",
  },
};
