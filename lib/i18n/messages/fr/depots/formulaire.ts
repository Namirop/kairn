/**
 * L'écran « Déposer » : le titre, le formulaire, ses deux facultatifs, et ce
 * qu'on montre quand la période est pleine.
 *
 * Les libellés courts de la capture et de la consigne tiennent à deux dans
 * 342 px sur un téléphone : un libellé plus long se vérifie à l'écran.
 */
export const formulaire = {
  metaTitre: "Déposer",
  titre: "Dépose ce que tu veux retenir",
  chapeau:
    "Le découpage part tout seul. Tu retrouves tes concepts dans la liste, sans rien lancer.",
  premierDepot: "Dépose la première chose que tu veux retenir. N'importe quoi fait l'affaire.",
  etiquetteTexte: "Ce que tu veux retenir",
  deposer: "Déposer",
  depotEnCours: "Dépôt en cours…",
  lectureDeLaCapture: "Lecture de la capture…",
  partageManque: "Le partage n'est pas arrivé jusqu'ici. Colle le texte, ou repartage-le.",
  /**
   * Quand le partage n'a rapporté qu'une adresse : nommer le geste qui marche,
   * la sélection étant le seul moyen sur un téléphone de choisir ce qu'on garde.
   */
  lienSansMatiere:
    "Un lien ne se retient pas. Retourne dans la conversation, sélectionne le passage, et repartage-le.",
  restants:
    "Il te reste {restants} {restants, plural, =1 {concept} other {concepts}} à retenir ce mois-ci.",
  compteur: "{longueur, number} / {maximum, number}",
  pieceJointe: {
    joindre: "Joindre une capture",
    joindreCourt: "Capture",
    changer: "Changer la capture",
    changerCourt: "Changer",
    retirer: "Retirer la capture",
  },
  consigne: {
    ajouter: "Ajouter une consigne",
    ajouterCourt: "Consigne",
    etiquette: "Ta consigne",
    retirer: "Retirer",
    exemple: "N'inclus pas la partie sur les prix",
    aide: "Ce qu'il faut laisser de côté dans ce dépôt. Elle cadre le découpage, elle n'ajoute rien à ce que tu retiens.",
  },
  plafond: {
    concepts: "Tu as atteint la limite du mois, autour de {limite} concepts.",
    depots: "Tu as atteint la limite du mois, {limite} dépôts.",
    /** `quand` arrive dit par `temps.remiseAZero`. */
    remiseAZero: "Le compteur repart {quand}.",
    offre:
      "L'offre complète en ouvre <nombre>{plafond}</nombre> par mois, pour <nombre>{prix} €</nombre>. Ce que tu as déjà déposé ne bouge pas, et les révisions du jour continuent.",
    voirLOffre: "Voir l'offre",
    /**
     * Premium n'est pas vendu en anglais : là où la langue de l'écran n'a pas
     * de caisse, cette phrase remplace l'offre. Jamais montrée en français.
     */
    horsVente: "Premium n'est pas encore disponible dans cette langue.",
    signalement:
      "Cette limite tient le coût des appels au modèle pendant que Kairn se construit. Si elle te gêne, dis-le : c'est le signal qui décidera de la suite.",
  },
  /** Le bouton nomme la limite : voir `components/depots/liste-dattente.tsx`. */
  listeDattente: {
    note: "C'est noté. Tu seras prévenu si la limite de {motif, select, concepts {concepts} other {dépôts}} change.",
    prevenir:
      "Me prévenir si la limite de {motif, select, concepts {concepts} other {dépôts}} change",
  },
};
