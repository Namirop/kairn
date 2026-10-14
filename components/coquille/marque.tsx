import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { MotDeMarque } from "@/components/coquille/mot-de-marque";
import { densiteDuSymbole } from "@/lib/design/marque";

/**
 * La marque : un empilement, un mot, ou les deux.
 *
 * Tout ce qui affiche la marque passe par ici ; la géométrie vient
 * d'`empiler()`. Seule exception : `app/opengraph-image.tsx` recompose le
 * verrouillage en styles en ligne, son moteur de rendu ne lisant pas de classes.
 * Le symbole y reste partagé (`symboleSeul()`).
 *
 * La pierre sur le i et le symbole ne coexistent jamais : le point du i en
 * pierre n'existe que pour le mot seul.
 */

export type VarianteDeMarque = "symbole" | "mot" | "verrouillage";
export type TonDeMarque = "encre" | "papier";

/** La hauteur du symbole, en pixels, quand l'appelant n'en demande pas d'autre. */
const TAILLE_PAR_DEFAUT = 24;

export function Marque({
  variante = "verrouillage",
  ton = "encre",
  taille = TAILLE_PAR_DEFAUT,
}: {
  variante?: VarianteDeMarque;
  ton?: TonDeMarque;
  /**
   * La hauteur du symbole, en pixels. Elle décide de sa densité — cinq pierres
   * au-dessus du seuil, trois en dessous — et le mot s'aligne dessus.
   */
  taille?: number;
}) {
  const clair = ton === "papier";

  if (variante === "mot") {
    return <MotDeMarque clair={clair} taille={taille} avecPierre />;
  }

  if (variante === "symbole") {
    return <SymboleDeMarque clair={clair} taille={taille} pierres={densiteDuSymbole(taille)} />;
  }

  // Le verrouillage suit la même règle de densité que le symbole seul : il se
  // pose aussi dans un en-tête, où cinq pierres sur vingt-quatre pixels feraient
  // un pâté.
  return (
    <span className="gap-pas-2 inline-flex items-center">
      <SymboleDeMarque clair={clair} taille={taille} pierres={densiteDuSymbole(taille)} />
      <MotDeMarque clair={clair} taille={taille} />
    </span>
  );
}
