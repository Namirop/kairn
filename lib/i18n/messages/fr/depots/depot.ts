/**
 * La liste des dépôts, et la page d'un dépôt : son texte, ses concepts, ce
 * qu'on peut en faire, et pourquoi il n'en montre aucun.
 */
export const liste = {
  metaTitre: "Dépôts",
  titre: "Ce que tu as déposé",
  chapeau: "Le texte d'origine n'est jamais réécrit. Il reste tel que tu l'as posé.",
  deposer: "Déposer",
};

export const depot = {
  metaTitre: "Dépôt",
  retour: "Retour aux dépôts",
  titre: "{nombre, plural, one {# concept} other {# concepts}}",
  /** `quand` arrive dit par `temps.anciennete`. */
  depose: "Déposé {quand}",
  ceQueTuAsDepose: "Ce que tu as déposé",
  consigneEcartait:
    "Ta consigne écartait une partie de ce dépôt : elle n'est pas montrée ici. Le texte d'origine, lui, est conservé tel que tu l'as posé.",
  captureTronquee:
    "La capture portait plus de texte qu'un dépôt n'en accepte. La lecture s'arrête à {maximum, number} caractères.",
  taConsigne: "Ta consigne : « {consigne} »",
  ceQuOnEnATire: "Ce qu'on en a tiré",
  conceptsTronques:
    "Ce texte en portait plus de {plafond}. On l'a suivi dans l'ordre et on s'est arrêté au dernier concept de cette liste — dépose la fin du texte pour avoir le reste.",
  lent: "Ça prend plus de temps que d'habitude. La page se mettra à jour toute seule.",
  aVerifier: {
    badge: "À vérifier",
    constat:
      "{nombre, plural, one {# concept paraît douteux. Tant que tu ne l'as pas tranché, il reste sans questions.} other {# concepts paraissent douteux. Tant que tu ne les as pas tranchés, ils restent sans questions.}}",
    voir: "{nombre, plural, one {Le voir} other {Voir le premier}}",
  },
  serie: {
    aujourdhui: "Ta série du jour en compte {nombre, plural, one {# concept} other {# concepts}}.",
    commencer: "Commencer",
    journeeFaite:
      "Ta journée est faite : {nombre, plural, one {# concept attend} other {# concepts attendent}} demain, celui-ci compris.",
  },
  gestes: {
    supprimer: "Supprimer ce dépôt",
    toutSupprimer:
      "{concepts, plural, =0 {Tout supprimer} =1 {Tout supprimer, le concept compris} other {Tout supprimer, les concepts compris}}",
    consequence:
      "Le texte, les concepts, leurs questions et leurs passages partent avec. Ça ne se défait pas.",
    unInstant: "Un instant",
    redecouper: "Redécouper",
    explication:
      "Redécouper relance une extraction sur le même texte, et prend une place de la journée comme un dépôt.",
  },
  /** Les quatre raisons d'un dépôt sans concept — voir `components/depots/vide-du-depot.tsx`. */
  vide: {
    rejete: {
      constat: "Rien à retenir dans ce dépôt.",
      contexte: "Ce texte ne porte pas de concept à réviser.",
    },
    echec: {
      constat: "Le découpage s'est arrêté en chemin.",
      contexte: "Rien n'a été écrit. Tu peux relancer le découpage sur le même texte.",
    },
    vide: {
      constat: "Tu as supprimé les concepts de ce dépôt.",
      contexte: "Le texte, lui, est toujours là. Tu peux le redécouper, ou supprimer le dépôt.",
    },
    lecture: {
      constat: "La capture est en cours de lecture.",
      contexte: "Le découpage suit dès que le texte en est tiré.",
    },
    attente: {
      constat: "Aucun concept pour l'instant.",
      contexte: "Les concepts apparaissent ici dès que le découpage a fini.",
    },
  },
};
