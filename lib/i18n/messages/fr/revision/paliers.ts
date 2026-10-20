/** Fin de session et raisons de n'avoir rien à réviser : des haltes, pas des récompenses. */
export const paliers = {
  intituleSession: "Session",
  deposer: "Déposer",
  deposerAutreChose: "Déposer autre chose",
  sentrainer: "S'entraîner",
  retourAujourdhui: "Retour à aujourd'hui",
  /** Une seule phrase pour toutes les portes de l'entraînement. */
  entrainementLibre:
    "S'entraîner pose d'autres questions sur les mêmes concepts, sans rien changer à ton planning.",
  fin: {
    titre: "{revus, plural, =0 {Rien n'a été revu} one {# concept revu} other {# concepts revus}}",
    demainRien: "Rien ne revient demain : tu es à jour. Ce que tu déposeras reviendra à son tour.",
    demain:
      "{nombre, plural, one {Un concept revient demain.} other {# concepts reviennent demain.}}",
    /** Espace insécable : « 19 h » est un nombre et son unité. */
    demainAvecRappel:
      "{nombre, plural, one {Un concept revient demain, rappel à {heure} h.} other {# concepts reviennent demain, rappel à {heure} h.}}",
    maitrise: "Tu maîtrises ça",
    maitrisePourquoi:
      "Trois passages justes, de plus en plus rapides. Tu ne le reconstruis plus, tu le sais.",
    espacement:
      "Une session s'arrête quand elle a servi ce qui était dû. Chaque concept retrouvé revient de plus loin — deux jours, puis une semaine, puis un mois. C'est l'écart qui fait tenir, pas la répétition.",
  },
  rien: {
    journeeFaiteTitre: "Tu as fait ta journée",
    journeeFaite:
      "{nombre, plural, one {# concept attend} other {# concepts attendent}} demain. Le plafond de ta session tient à ça : ce qui reste est encore dû, et il passera en tête.",
    videTitre: "Rien à revoir pour l'instant",
    vide: "Kairn repose ce que tu lui donnes. Dépose une première chose que tu veux garder, et elle reviendra d'elle-même.",
    attenteTitre: "Les questions arrivent",
    attente:
      "Tes concepts sont découpés, leurs questions sont en cours d'écriture. Elles seront là à ta prochaine visite.",
    voirDepots: "Voir ce que tu as déposé",
    aJourTitre: "Tu es à jour",
    aJour: "Rien à revoir aujourd'hui.",
    /** `delai` vient de l'espace `temps` : « demain », « dans 3 jours ». */
    aJourProchain: "Rien à revoir aujourd'hui. Le prochain concept revient {delai}.",
  },
};
