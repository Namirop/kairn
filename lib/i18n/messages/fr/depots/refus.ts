/**
 * Les refus du dépôt, dits à la personne.
 *
 * Les mêmes clés servent à l'écran avant l'envoi et au serveur après : c'est la
 * même règle, et une phrase en double est une phrase qui finit par diverger.
 * Les bornes elles-mêmes vivent dans `lib/depots/bornes-du-depot.ts` et
 * arrivent ici en paramètres.
 */
export const refus = {
  /**
   * Une longueur en signes et en mots : personne ne compte les caractères d'un
   * texte, tout le monde sait ce que pèsent mille mots.
   */
  longueurEnClair: "{caracteres, number} caractères, environ {mots, number} mots",
  /**
   * Une consigne trop longue ne se tronque pas : coupée au milieu, « n'inclus pas
   * les prix, sauf le tableau de la fin » dirait le contraire.
   */
  consigneTropLongue:
    "Ta consigne fait {caracteres, number} signes, et elle en prend {maximum}. Dis-la en une phrase ou deux.",
  /**
   * Une seule phrase pour les trois endroits qui la prononcent : l'écran avant
   * l'envoi, le dépôt avant de réserver la place, le lecteur d'images.
   */
  imageTropLourde:
    "Cette image est trop lourde pour partir. Recadre-la sur ce qui t'intéresse, ou réduis-la avant de la déposer.",
  /** Le lecteur d'images n'a pas reconnu le fichier — voir `lib/images/capture.ts`. */
  imageIllisible:
    "Ce fichier n'est pas une image que l'on sait lire. Dépose une capture en JPEG, PNG, WebP ou GIF.",
  /**
   * Un texte trop long ne se tronque pas : la coupe tomberait au milieu d'une
   * phrase, et le début d'un texte collé est souvent ce qui compte le moins.
   * C'est à la personne de choisir ; les deux nombres disent de combien elle
   * dépasse.
   */
  texteTropLong:
    "C'est {caracteres, number} signes, et un dépôt en prend {maximum, number}. Garde le passage qui compte.",
  /** `longueur` arrive dite par `longueurEnClair`. */
  depotTropLong:
    "Ce dépôt dépasse {longueur}. Coupe-le en deux : deux dépôts valent mieux qu'un tronqué.",
  cleIllisible: "Ce dépôt n'a pas pu être identifié. Recharge la page et recommence.",
  nonRecevable: "Ce dépôt n'est pas recevable.",
  rienADeposer: "Il n'y a rien à déposer : colle un texte, ou joins une capture.",
  /** Voir `lib/depots/refus-de-quota.ts` : chacun nomme sa cause. */
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
    /** Le vide a son propre message : le problème est une absence, pas une quantité. */
    rienADecouper: "Il n'y a rien à découper. Colle une phrase, un paragraphe, un article.",
    tropCourt: "Colle un peu plus de matière : une phrase ou deux, au minimum.",
    /**
     * Ce qu'il doit dire : ce n'est pas la limite du produit. Les deux longueurs
     * arrivent dites par `longueurEnClair`.
     */
    tropLong:
      "Ce texte dépasse {limiteEssai}, la limite d'un essai sans compte. Un compte en prend {limiteCompte}, et il est gratuit.",
    tropDeDepots:
      "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.",
    /**
     * Les essais du jour sont faits, et ils ont donné quelque chose. Les essais se
     * comptent sur vingt-quatre heures glissantes : dire quand la porte se rouvre
     * est la seule chose utile, et dissuade d'aller la contourner sur un autre
     * navigateur.
     */
    duJourFaits:
      "Tes essais du jour sont faits. Crée un compte pour garder tes concepts et en déposer d'autres, ou reviens demain.",
    /**
     * Le même refus quand les essais n'ont rien donné : « tes concepts »
     * désignerait du vide et ferait passer l'invitation pour un bug.
     */
    epuises:
      "Tes essais du jour sont faits. Un compte lève la limite, accepte {limiteCompte}, et c'est gratuit.",
    /**
     * La visite s'est fermée sur nos pannes, pas sur ses essais : ceux-ci sont
     * intacts, et lui dire qu'ils sont faits serait faux.
     */
    decoupageIndisponible:
      "Le découpage ne répond pas en ce moment, et ça ne vient pas de ton texte. Crée un compte : tu pourras reprendre dès que ce sera rétabli.",
  },
};
