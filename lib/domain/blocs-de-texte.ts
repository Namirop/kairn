import { lignesRecollees } from "./lignes-recollees";

/**
 * Un texte déposé, séparé en ce qui se lit et ce qui se recopie.
 *
 * **Le code cité en bloc n'était pas lu comme du code.** Une reconnaissance de
 * texte rend ce que tout le monde écrit — trois accents graves, la langue, les
 * lignes, trois accents graves — et `segmentsDeCode`, qui ne connaît que la
 * paire d'accents en ligne, y voyait une suite de jetons sans rapport : `js`
 * seul dans son cadre, puis une ligne entière dans un autre, puis le mot resté
 * au bout. Le seul dépôt de code de la production le montre en entier.
 *
 * Ce module tranche donc avant : ce qui est entre des barrières est du code, à
 * recopier tel quel — indentation, espaces, retours —, et tout le reste est de
 * la prose, qui se recolle et dont les termes en ligne se relèvent comme avant.
 *
 * Fonction pure : elle dit ce que le texte contient, jamais comment le peindre.
 */

export type BlocDeTexte =
  { type: "code"; langage: string | null; texte: string } | { type: "prose"; texte: string };

/** Trois accents graves seuls sur leur ligne, avec ou sans nom de langage. */
const BARRIERE = /^\s*```[ \t]*([A-Za-z0-9+#_-]*)[ \t]*$/;

function normaliser(texte: string): string {
  return texte.replace(/\r\n?/g, "\n");
}

function poserLaProse(blocs: BlocDeTexte[], lignes: string[]): void {
  const texte = lignesRecollees(lignes.join("\n")).trim();

  if (texte.length > 0) blocs.push({ type: "prose", texte });
}

function poserLeCode(blocs: BlocDeTexte[], lignes: string[], langage: string | null): void {
  // Les lignes vides du début et de la fin partent, l'indentation reste : la
  // première est un artefact de la barrière, la seconde est du sens.
  const texte = lignes.join("\n").replace(/^\n+|\n+$/g, "");

  if (texte.length > 0) blocs.push({ type: "code", langage, texte });
}

/**
 * Les blocs d'un texte, dans l'ordre où ils s'y trouvent.
 *
 * Une barrière ouverte et jamais refermée ferme au bout du texte. C'est le cas
 * d'une capture coupée en plein extrait : le rendre en code respecte ce qu'on
 * lisait à l'écran, là où le rendre en prose recollerait des lignes de code en
 * une phrase — le pire des deux résultats.
 */
export function blocsDeTexte(texte: string): BlocDeTexte[] {
  const blocs: BlocDeTexte[] = [];
  let courant: string[] = [];
  let langage: string | null = null;
  let dansLeCode = false;

  for (const ligne of normaliser(texte).split("\n")) {
    const barriere = BARRIERE.exec(ligne);

    if (!barriere) {
      courant.push(ligne);
      continue;
    }

    if (dansLeCode) {
      poserLeCode(blocs, courant, langage);
      langage = null;
    } else {
      poserLaProse(blocs, courant);
      langage = barriere[1] ? barriere[1].toLowerCase() : null;
    }

    courant = [];
    dansLeCode = !dansLeCode;
  }

  if (dansLeCode) poserLeCode(blocs, courant, langage);
  else poserLaProse(blocs, courant);

  return blocs;
}

/** Vrai dès qu'un bloc de code est cité. Évite un rendu inutile. */
export function porteDuCodeEnBloc(texte: string): boolean {
  return blocsDeTexte(texte).some((bloc) => bloc.type === "code");
}
