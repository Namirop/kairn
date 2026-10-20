/**
 * L'essai sans compte. Deux mesures à tenir : « 1 concept t'attend. » sur une
 * ligne de 390 points (voir `EssaiRepris`), et la plus longue paire de noms de
 * format dans la fenêtre.
 */
export const essai = {
  formulaire: {
    titreHaut: "Dépose",
    titreBas: "quelque chose.",
    mecanisme:
      "Kairn découpe ce que tu colles en concepts, en fait des questions, et te les repose juste avant que tu les oublies.",
    exemples: "Ou pars d'un exemple :",
  },
  champ: {
    intitule: "Ce que tu veux retenir",
    enGrand: "Écrire en grand",
    descriptionEnGrand:
      "La même zone de dépôt, en plus grand. Ce que tu écris ici se retrouve dans le formulaire.",
  },
  action: {
    envoyer: "Voir ce que ça donne",
    enCours: "Découpage en cours…",
    rassurance: "Sans compte, sans email.",
    reprise: "Ce que tu viens de voir reste à toi : tu le récupères aussi en créant ton compte.",
  },
  fenetre: {
    titre: "Ce que ton texte a donné",
    fermer: "Fermer",
  },
  attente: {
    titre: "On découpe ton texte.",
    longue:
      "On cherche encore. Tes concepts s'afficheront ici dès qu'ils arrivent, tu n'as rien à faire.",
    courte: "Tes concepts s'affichent ici même, pas dans un écran d'inscription.",
    abandonTitre: "Le découpage prend son temps.",
    abandonTexte:
      "Ton texte n'est pas perdu. Reviens sur cette page dans un moment : tes concepts t'y attendront.",
    verifier: "Vérifier maintenant",
  },
  resultat: {
    titre: "{nombre, plural, one {# concept.} other {# concepts.}}",
    promesse:
      "{nombre, plural, one {Il te sera reposé seul, au moment où tu allais l'oublier.} other {Chacun sera reposé séparément, au moment où tu allais l'oublier.}}",
  },
  echantillon: {
    titre:
      "{nombre, plural, one {Une question sur l'un d'eux.} other {# questions sur l'un d'eux.}}",
    rotation:
      "Elles tournent d'un passage à l'autre. C'est le concept qui doit tenir, pas une phrase apprise par cœur.",
    formats: "Format de la question",
    ecritureTitre: "On écrit les questions.",
    ecritureTexte:
      "Quatre formulations sur le même concept, de formats différents. Une vingtaine de secondes.",
    ecritureAbandonTitre: "Les questions prennent leur temps.",
    ecritureAbandonTexte:
      "Tes concepts sont déjà là, c’est l’échantillon qui manque. Il s’écrit toujours, et il s’affichera ici la prochaine fois que tu passes.",
    verifier: "Vérifier maintenant",
  },
  /** Copie de `depots.formats`, pour la rotation démontrée sur la landing. */
  libelleFormat: {
    MCQ: "QCM",
    CLOZE: "Texte à trou",
    TRUE_FALSE: "Vrai ou faux",
    SHORT_ANSWER: "Réponse courte",
    CODE: "Code",
    EXPLAIN: "Explication",
  },
  repris: {
    titre: "{nombre, plural, one {# concept t'attend.} other {# concepts t'attendent.}}",
    texte:
      "On les a sortis de ce que tu viens de déposer. Ton adresse suffit pour qu'on te les repose au bon moment, et tu récupères ceux-ci.",
    garder: "Les garder",
    revoir: "Revoir les concepts",
  },
  garder: {
    garder: "Les garder",
    mention: "Ton adresse suffit, et tu récupères ceux-ci.",
  },
  sortie: {
    redeposer: "Déposer autre chose",
    essaisFaits: "Tu as fait tes deux essais du jour.",
  },
};
