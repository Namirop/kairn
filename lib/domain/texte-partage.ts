/**
 * Ce qu'un partage du système dépose dans le champ, et ce qu'il faut en penser.
 *
 * Android ne transporte pas « un texte » et « une adresse » : il transporte
 * `EXTRA_TEXT` et `EXTRA_SUBJECT`, et c'est le navigateur qui range le premier
 * dans `text` ou dans `url` selon qu'il ressemble ou non à une adresse. La même
 * conversation partagée depuis deux applications arrive donc dans deux champs
 * différents, et celle qui partage « regarde ça : <adresse> » remplit les deux
 * avec la même adresse dedans. Aucun des trois champs ne se croit sur parole :
 * on reconnaît l'adresse là où elle est, et on recompose.
 *
 * **Le cas qui compte est l'adresse seule.** Le bouton « Partager » d'une
 * conversation ne partage pas la conversation : il partage son adresse
 * publique. Kairn ne va pas la lire — ce serait dépendre du HTML de quelqu'un
 * d'autre, et ça ne marcherait que sur les conversations rendues publiques. Ce
 * qui reste à faire, c'est le dire tout de suite, avant qu'un dépôt parte avec
 * une ligne dont personne ne tirera de concept.
 *
 * Le titre ne sert que de repli. C'est le nom de la conversation d'en face, pas
 * de la matière ; il vaut mieux qu'un champ vide, et moins que n'importe quelle
 * phrase partagée.
 */

export type PartagePose = {
  /** `EXTRA_SUBJECT` : le nom de ce qu'on partage, rarement de la matière. */
  titre?: string | null;
  /** `EXTRA_TEXT` : la sélection, ou l'adresse quand l'application n'en donne pas. */
  texte?: string | null;
  /** Ce que le navigateur a reconnu comme une adresse, quand il l'a reconnu. */
  lien?: string | null;
};

export type PartageCompose = {
  /** Ce qui remplit le champ de dépôt. Vide quand le partage ne portait rien. */
  texte: string;
  /**
   * Le partage ne portait qu'une adresse.
   *
   * Il y a bien quelque chose à mettre dans le champ, et rien à en retenir :
   * c'est l'écran qui doit le dire, pas le serveur une fois le dépôt parti.
   */
  lienSeul: boolean;
};

/** Une adresse et rien d'autre : pas d'espace, donc pas de phrase autour. */
const ADRESSE_SEULE = /^https?:\/\/\S+$/i;

function propre(valeur: string | null | undefined): string {
  return (valeur ?? "").trim();
}

/**
 * Le champ de dépôt tel qu'un partage le remplit.
 *
 * L'adresse se met **après** la prose et sur sa propre ligne : c'est la source,
 * pas le sujet. Et elle ne se répète pas — une sélection qui contient déjà son
 * lien l'aurait sinon deux fois, à deux lignes d'écart.
 */
export function composerLePartage(partage: PartagePose): PartageCompose {
  const titre = propre(partage.titre);
  const texte = propre(partage.texte);
  const lien = propre(partage.lien);

  // Quand `texte` n'est qu'une adresse, c'est l'adresse — quel que soit le champ
  // dans lequel le navigateur a choisi de la ranger.
  const adresseDansLeTexte = ADRESSE_SEULE.test(texte);
  const prose = adresseDansLeTexte ? "" : texte;
  const adresse = adresseDansLeTexte ? texte : lien;

  const morceaux = [
    prose.length > 0 ? prose : titre,
    adresse.length > 0 && !prose.includes(adresse) ? adresse : "",
  ];

  return {
    texte: morceaux.filter((morceau) => morceau.length > 0).join("\n\n"),
    // On ajoute ce que le champ d'adresse portait quoi qu'il porte — rien de ce
    // qui est partagé ne se perd —, mais on ne le déclare « lien seul » que si
    // c'en est vraiment une. Ce champ est rempli par le navigateur, et le croire
    // sur parole reviendrait à renvoyer quelqu'un sélectionner son passage parce
    // qu'il a partagé un mot isolé.
    lienSeul: prose.length === 0 && ADRESSE_SEULE.test(adresse),
  };
}

/**
 * Ce qu'on dit quand le partage n'a rapporté qu'une adresse.
 *
 * Elle nomme le geste qui marche plutôt que de constater l'échec : la sélection
 * est le seul moyen, sur un téléphone, de choisir ce qu'on garde d'une
 * conversation.
 */
export const LIEN_SANS_MATIERE =
  "Un lien ne se retient pas. Retourne dans la conversation, sélectionne le passage, et repartage-le.";
