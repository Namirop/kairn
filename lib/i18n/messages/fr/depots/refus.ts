/**
 * Les refus du dépôt. Mêmes clés à l'écran avant l'envoi et au serveur après :
 * une phrase en double finit par diverger. Les bornes viennent en paramètres de
 * `lib/depots/bornes-du-depot.ts`.
 */
export const refus = {
  /** Personne ne compte des caractères, tout le monde sait ce que pèsent mille mots. */
  longueurEnClair: "{caracteres, number} caractères, environ {mots, number} mots",
  /** Pas de troncature : coupée, « n'inclus pas les prix, sauf… » dirait le contraire. */
  consigneTropLongue:
    "Ta consigne fait {caracteres, number} signes, et elle en prend {maximum}. Dis-la en une phrase ou deux.",
  /** Dite à trois endroits : l'écran, le dépôt avant réservation, le lecteur d'images. */
  imageTropLourde:
    "Cette image est trop lourde pour partir. Recadre-la sur ce qui t'intéresse, ou réduis-la avant de la déposer.",
  /** Voir `lib/images/capture.ts`. */
  imageIllisible:
    "Ce fichier n'est pas une image que l'on sait lire. Dépose une capture en JPEG, PNG, WebP ou GIF.",
  /** Enregistré sur le dépôt, donc dit dans la langue du dépôt. */
  captureSansTexte:
    "Cette capture ne porte pas de texte lisible. Recadre-la sur le passage qui t'intéresse, ou colle le texte directement.",
  /**
   * Pas de troncature : la coupe tomberait en pleine phrase, et le début d'un
   * collage compte souvent le moins. La personne choisit, chiffres à l'appui.
   */
  texteTropLong:
    "C'est {caracteres, number} signes, et un dépôt en prend {maximum, number}. Garde le passage qui compte.",
  /** `longueur` arrive dite par `longueurEnClair`. */
  depotTropLong:
    "Ce dépôt dépasse {longueur}. Coupe-le en deux : deux dépôts valent mieux qu'un tronqué.",
  cleIllisible: "Ce dépôt n'a pas pu être identifié. Recharge la page et recommence.",
  nonRecevable: "Ce dépôt n'est pas recevable.",
  rienADeposer: "Il n'y a rien à déposer : colle un texte, ou joins une capture.",
  /** Une phrase par cause, voir `lib/depots/refus-de-quota.ts`. */
  quota: {
    concepts: "Tu as atteint la limite du mois, autour de {plafond} concepts.",
    depots: "Tu as fait tous les dépôts du mois.",
    debit: "Trop de dépôts coup sur coup. Laisse passer une minute.",
  },
  introuvable: "Ce dépôt est introuvable.",
  rienARedecouper: "Il n'y a rien à redécouper dans ce dépôt.",
  pasDeTexteARedecouper: "Ce dépôt n'a pas de texte à redécouper.",
  /** L'essai sans compte, sur la landing — voir `lib/depots/deposer-sans-compte.ts`. */
  essai: {
    /** Distinct de `tropCourt` : une absence, pas une quantité. */
    rienADecouper: "Il n'y a rien à découper. Colle une phrase, un paragraphe, un article.",
    tropCourt: "Colle un peu plus de matière : une phrase ou deux, au minimum.",
    /** Dire que ce n'est pas la limite du produit. Longueurs via `longueurEnClair`. */
    tropLong:
      "Ce texte dépasse {limiteEssai}, la limite d'un essai sans compte. Un compte en prend {limiteCompte}, et il est gratuit.",
    tropDeDepots:
      "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.",
    /**
     * Essais faits et fructueux. Comptés sur 24 h glissantes : dire quand ça
     * rouvre est utile et dissuade de contourner par un autre navigateur.
     */
    duJourFaits:
      "Tes essais du jour sont faits. Crée un compte pour garder tes concepts et en déposer d'autres, ou reviens demain.",
    /** Essais restés vides : « tes concepts » désignerait du vide, comme un bug. */
    epuises:
      "Tes essais du jour sont faits. Un compte lève la limite, accepte {limiteCompte}, et c'est gratuit.",
    /** Fermé sur nos pannes : ses essais sont intacts, les dire faits serait faux. */
    decoupageIndisponible:
      "Le découpage ne répond pas en ce moment, et ça ne vient pas de ton texte. Crée un compte : tu pourras reprendre dès que ce sera rétabli.",
  },
};
