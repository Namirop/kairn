/**
 * Ce qu'un partage du système dépose dans le champ de dépôt.
 *
 * Android transporte `EXTRA_TEXT` et `EXTRA_SUBJECT`, et c'est le navigateur qui
 * range le premier dans `text` ou `url` selon qu'il ressemble à une adresse :
 * selon l'application, la même chose arrive dans des champs différents. Aucun
 * champ ne se croit sur parole ; on reconnaît l'adresse là où elle est.
 *
 * Le cas qui compte est l'adresse seule (le « Partager » d'une conversation
 * d'IA) : Kairn ne va pas la lire, il faut donc le dire avant qu'un dépôt parte
 * sans rien à retenir. Le titre ne sert que de repli.
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
   * Le partage ne portait qu'une adresse : rien à en retenir, et c'est l'écran
   * qui doit le dire, pas le serveur une fois le dépôt parti.
   */
  lienSeul: boolean;
};

/** Une adresse et rien d'autre : pas d'espace, donc pas de phrase autour. */
const ADRESSE_SEULE = /^https?:\/\/\S+$/i;

function propre(valeur: string | null | undefined): string {
  return (valeur ?? "").trim();
}

/**
 * Le champ de dépôt tel qu'un partage le remplit. L'adresse vient après la
 * prose, sur sa ligne (c'est la source, pas le sujet), et seulement si la prose
 * ne la contient pas déjà.
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
    // Le champ d'adresse est gardé quoi qu'il porte, mais ne vaut « lien seul »
    // que s'il en est vraiment une : le navigateur peut y ranger un mot isolé.
    lienSeul: prose.length === 0 && ADRESSE_SEULE.test(adresse),
  };
}
