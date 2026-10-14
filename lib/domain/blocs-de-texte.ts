import { lignesRecollees } from "./lignes-recollees";

/**
 * Un texte déposé, séparé en prose et en blocs de code entre barrières (```).
 *
 * Ce découpage passe avant `segmentsDeCode`, qui ne connaît que le code en
 * ligne et lirait un bloc comme une suite de jetons sans rapport. Le code se
 * garde tel quel ; la prose se recolle.
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
 * Les blocs d'un texte, dans l'ordre. Une barrière jamais refermée (capture
 * coupée en plein extrait) ferme au bout du texte : en prose, les lignes de code
 * seraient recollées en une phrase.
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
