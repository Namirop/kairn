/**
 * Ce qu'un partage du système dépose dans le champ de dépôt. Le navigateur range
 * `EXTRA_TEXT` dans `text` ou `url` selon qu'il ressemble à une adresse : aucun
 * champ ne se croit sur parole. Une adresse seule (le « Partager » d'une
 * conversation d'IA) doit se signaler, Kairn ne va pas la lire.
 */

export type PartagePose = {
  /** `EXTRA_SUBJECT`, rarement de la matière : un repli. */
  titre?: string | null;
  /** `EXTRA_TEXT` : la sélection, ou l'adresse quand l'application n'en donne pas. */
  texte?: string | null;
  lien?: string | null;
};

export type PartageCompose = {
  texte: string;
  /** À dire à l'écran, avant que le dépôt parte sans rien à retenir. */
  lienSeul: boolean;
};

const ADRESSE_SEULE = /^https?:\/\/\S+$/i;

function propre(valeur: string | null | undefined): string {
  return (valeur ?? "").trim();
}

/** L'adresse vient après la prose, sur sa ligne : c'est la source, pas le sujet. */
export function composerLePartage(partage: PartagePose): PartageCompose {
  const titre = propre(partage.titre);
  const texte = propre(partage.texte);
  const lien = propre(partage.lien);

  const adresseDansLeTexte = ADRESSE_SEULE.test(texte);
  const prose = adresseDansLeTexte ? "" : texte;
  const adresse = adresseDansLeTexte ? texte : lien;

  const morceaux = [
    prose.length > 0 ? prose : titre,
    adresse.length > 0 && !prose.includes(adresse) ? adresse : "",
  ];

  return {
    texte: morceaux.filter((morceau) => morceau.length > 0).join("\n\n"),
    // Le navigateur peut ranger un mot isolé dans le champ d'adresse.
    lienSeul: prose.length === 0 && ADRESSE_SEULE.test(adresse),
  };
}
