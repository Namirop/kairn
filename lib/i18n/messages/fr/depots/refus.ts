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
   * Une longueur en signes, plus ce qu'elle représente en mots.
   *
   * « Textes plus longs » ne veut rien dire : pour un visiteur, ça peut être trois
   * mille comme quinze mille signes, et il n'a aucun moyen de savoir si son
   * article passe. Les deux nombres ensemble parce que personne ne compte les
   * caractères d'un texte, et que tout le monde sait ce que pèsent mille mots.
   */
  longueurEnClair: "{caracteres, number} caractères, environ {mots, number} mots",
  /**
   * Ce qu'on dit d'une consigne trop longue.
   *
   * Elle ne se tronque pas : couper une consigne au trois-centième signe la
   * retournerait parfois — « n'inclus pas la partie sur les prix, sauf le tableau
   * de la fin » coupé au milieu dit le contraire de ce qu'on voulait.
   */
  consigneTropLongue:
    "Ta consigne fait {caracteres, number} signes, et elle en prend {maximum}. Dis-la en une phrase ou deux.",
  /**
   * Le refus, dit une seule fois pour les trois endroits qui le prononcent.
   *
   * L'écran avant l'envoi, le dépôt avant de réserver la place, et le lecteur
   * d'images au moment de décoder. Il y en avait déjà deux versions, une courte et
   * une longue, pour la même règle.
   */
  imageTropLourde:
    "Cette image est trop lourde pour partir. Recadre-la sur ce qui t'intéresse, ou réduis-la avant de la déposer.",
  /** Le lecteur d'images n'a pas reconnu le fichier — voir `lib/images/capture.ts`. */
  imageIllisible:
    "Ce fichier n'est pas une image que l'on sait lire. Dépose une capture en JPEG, PNG, WebP ou GIF.",
  /**
   * Ce qu'on dit d'un texte plus long que ce qu'un dépôt accepte.
   *
   * Il ne se tronque pas : couper au seizième millier tomberait au milieu d'une
   * phrase, et le début d'une conversation est justement le morceau dont on n'a
   * rien à retenir. C'est à la personne de garder ce qui compte, et le message
   * dit les deux nombres pour qu'elle sache de combien elle dépasse.
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
    /**
     * Le vide a son propre message. « Colle un peu plus de matière » devant un
     * champ où l'on n'a rien mis parle d'une quantité alors que le problème est
     * une absence.
     */
    rienADecouper: "Il n'y a rien à découper. Colle une phrase, un paragraphe, un article.",
    tropCourt: "Colle un peu plus de matière : une phrase ou deux, au minimum.",
    /**
     * Le refus de longueur d'un essai, et la seule chose importante qu'il ait à
     * dire : **ce n'est pas la limite du produit.** Les deux longueurs arrivent
     * dites par `longueurEnClair`.
     */
    tropLong:
      "Ce texte dépasse {limiteEssai}, la limite d'un essai sans compte. Un compte en prend {limiteCompte}, et il est gratuit.",
    tropDeDepots:
      "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.",
    /**
     * Les essais du jour sont faits, et ils ont donné quelque chose.
     *
     * « Pour cette visite » a cessé d'être vrai le jour où les essais se sont comptés
     * sur vingt-quatre heures glissantes : la même personne, avec le même cookie,
     * redépose demain. Dire quand la porte se rouvre est la seule chose utile à
     * quelqu'un qu'on refuse, et c'est aussi ce qui l'empêche d'aller chercher un
     * autre navigateur pour la contourner.
     */
    duJourFaits:
      "Tes essais du jour sont faits. Crée un compte pour garder tes concepts et en déposer d'autres, ou reviens demain.",
    /**
     * Le même refus, mais sans concepts derrière.
     *
     * L'essai n'a rien donné, deux fois. Lui parler de « tes concepts » désignerait
     * du vide et ferait passer l'invitation pour un bug ; on dit ce qui s'est passé,
     * et ce qu'un compte change — des dépôts plus longs, et des reprises.
     */
    epuises:
      "Tes essais du jour sont faits. Un compte lève la limite, accepte {limiteCompte}, et c'est gratuit.",
    /**
     * La visite s'est fermée sur nos pannes, pas sur ses essais.
     *
     * Ses essais sont intacts — c'est toute la règle — donc lui dire qu'ils sont
     * faits serait le troisième message faux de ce chemin. On dit ce qui se passe
     * vraiment, et le compte devient la seule suite qu'on ait à offrir.
     */
    decoupageIndisponible:
      "Le découpage ne répond pas en ce moment, et ça ne vient pas de ton texte. Crée un compte : tu pourras reprendre dès que ce sera rétabli.",
  },
};
