import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { MotDeMarque } from "@/components/coquille/mot-de-marque";
import { densiteDuSymbole } from "@/lib/design/marque";

/**
 * Tout ce qui affiche la marque passe par ici, sauf `app/opengraph-image.tsx`
 * dont le moteur ne lit pas de classes. Le point du i en pierre n'existe que
 * pour le mot seul : il ne coexiste jamais avec le symbole.
 */

export type VarianteDeMarque = "symbole" | "mot" | "verrouillage";
export type TonDeMarque = "encre" | "papier";

const TAILLE_PAR_DEFAUT = 24;

export function Marque({
  variante = "verrouillage",
  ton = "encre",
  taille = TAILLE_PAR_DEFAUT,
}: {
  variante?: VarianteDeMarque;
  ton?: TonDeMarque;
  /** Hauteur du symbole en pixels : elle décide de sa densité, le mot s'aligne dessus. */
  taille?: number;
}) {
  const clair = ton === "papier";

  if (variante === "mot") {
    return <MotDeMarque clair={clair} taille={taille} avecPierre />;
  }

  if (variante === "symbole") {
    return <SymboleDeMarque clair={clair} taille={taille} pierres={densiteDuSymbole(taille)} />;
  }

  // Même densité que le symbole seul : en en-tête, cinq pierres sur 24 px font un pâté.
  return (
    <span className="gap-pas-2 inline-flex items-center">
      <SymboleDeMarque clair={clair} taille={taille} pierres={densiteDuSymbole(taille)} />
      <MotDeMarque clair={clair} taille={taille} />
    </span>
  );
}
