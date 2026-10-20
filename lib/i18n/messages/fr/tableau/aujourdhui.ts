/**
 * L'écran Aujourd'hui. Le compteur affiche son nombre en grand au-dessus :
 * `aRevoir` ne le répète pas, il n'en prend que l'accord.
 */
export const aujourdhui = {
  titre: "Aujourd'hui",
  compteur: {
    rienDepose: "Rien à revoir tant que tu n'as rien déposé.",
    questionsEnRoute: "Tes concepts sont là, leurs questions s'écrivent. Reviens dans un moment.",
    journeeFaite:
      "Ta journée est faite : {nombre, plural, one {# concept revu} other {# concepts revus}}, le maximum d'une journée.",
    calme: "Rien à revoir aujourd'hui. Les prochains concepts reviendront d'eux-mêmes.",
    aRevoir: "{nombre, plural, one {concept à revoir} other {concepts à revoir}} aujourd'hui.",
    enAttente:
      "{nombre} de plus {nombre, plural, one {attend son tour} other {attendent leur tour}}.",
    plafondParDefaut: "Une session s'arrête à {plafond} concepts, <lien>et ça se règle</lien>.",
    plafondRegle: "Tu as réglé ta session à {plafond} concepts, <lien>et ça se rechange</lien>.",
    reste: "Le reste revient demain, en commençant par ce qui risque le plus.",
    sansQuestions:
      "{nombre, plural, one {# concept attend} other {# concepts attendent}} encore leurs questions. Elles s'écrivent, ils rejoindront la session d'eux-mêmes.",
    commencer: "Commencer",
    entrainer: "S'entraîner",
    entrainerAide: "D'autres questions sur les mêmes concepts. Ça ne change pas ton planning.",
    deposer: "Déposer quelque chose",
  },
  dette: {
    constat:
      "Ça fait {jours} jours que le retard ne descend pas : {enAttente} concepts attendent derrière la session du jour.",
    auMaximum:
      "Ta session est déjà au maximum, {plafond} concepts par jour. Il ne reste qu'à lever le pied sur les dépôts quelques jours, le temps que ça redescende.",
    deuxFacons:
      "Deux façons de le résorber : lever le pied sur les dépôts quelques jours, ou <lien>monter le plafond de ta session</lien>, aujourd'hui à {plafond} concepts par jour.",
  },
  depots: {
    titre: "Ce que tu as déposé",
    toutVoir: "Tout voir",
    videConstat: "Tu n'as encore rien déposé.",
    videContexte: "Une phrase, un pavé collé, une capture d'écran — tout fait un point de départ.",
    /** Lu en tête d'un dépôt d'image ; l'icône est muette. */
    capture: "Capture.",
    captureEnLecture: "Capture en cours de lecture",
    concepts: "{nombre, plural, one {# concept} other {# concepts}}",
  },
  cairn: {
    titre: "Ton cairn",
    legendeVide: "Le premier concept retenu posera la première pierre.",
    legende:
      "{nombre, plural, one {# concept retenu} other {# concepts retenus}}. Une pierre chacun.",
    promesse:
      "Une pierre par concept retenu : quand il revient de loin et que tu le retrouves trois fois de suite, ou quand tu déclares le maîtriser. Pas quand tu l'as lu.",
    forme:
      "La forme de chaque pierre est tirée du concept qu'elle représente. Personne n'empile les mêmes.",
  },
  progression: {
    serie: "Série",
    serieVide: "Une session aujourd'hui ouvre ta série.",
    serieAide:
      "Le nombre de sessions consécutives, sans en manquer une. Une journée où rien n'arrive à échéance ne compte pas, et ne casse rien.",
    serieUnite: "{nombre, plural, =1 {session} other {sessions d'affilée}}",
    niveau: "Niveau",
    niveauAide:
      "Un point par question passée en session, un de plus quand tu retrouves un concept que tu avais raté. La justesse n'entre pas dans le calcul.",
    restant: "{restant} XP avant le niveau {suivant}",
  },
};
