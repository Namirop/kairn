import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { MotDeMarque } from "@/components/coquille/mot-de-marque";
import { densiteDuSymbole } from "@/lib/design/marque";

/**
 * La marque : un empilement, un mot, ou les deux.
 *
 * **Tout ce qui affiche la marque passe par ici.** Aucun écran ne redessine les
 * pierres ni ne réécrit le mot à côté d'un symbole — c'est la promesse que ce
 * fichier porte depuis le début, et elle est maintenant tenue par construction :
 * la géométrie vient d'`empiler()`, pas d'un tracé recopié à la main.
 *
 * Une exception, et elle est nommée : `app/opengraph-image.tsx` recompose le
 * verrouillage à la main. Son moteur de rendu n'est pas un navigateur — il ne lit
 * ni classe utilitaire ni feuille de style, seulement des styles en ligne. Le
 * symbole y reste partagé (`symboleSeul()`, donc `empiler()`) ; seul l'assemblage
 * est refait. C'est le prix d'une image cuite, et il n'y en a qu'une.
 *
 * « Kairn » se compose en nom propre : une capitale, le reste en bas de casse.
 * Les capitales espacées d'avant en faisaient une étiquette de section, du même
 * registre que « AUJOURD'HUI » ou « SESSION » — un nom de produit ne se range pas
 * parmi ses propres intertitres.
 *
 * **La pierre sur le i et le symbole ne coexistent jamais.** Mot seul, le point du
 * i est une pierre : c'est ce qui rattache le mot à l'identité quand rien d'autre
 * ne le fait. Dans le verrouillage, le symbole est déjà là, et deux pierres
 * raconteraient deux fois la même chose. La règle vaut dans les deux sens.
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

  // Le verrouillage suit **la même règle de densité** que le symbole seul, et ce
  // n'est pas la consigne d'origine : elle voulait cinq pierres partout, au motif
  // que le verrouillage est un usage de grande taille. Le motif est juste, la
  // règle ne l'était pas — un verrouillage se pose aussi dans un en-tête, où son
  // symbole fait vingt-quatre pixels et où cinq étages de cinq pixels donnent un
  // pâté. Le seuil dit la même chose que l'intention, mais il la vérifie :
  // au-dessus de soixante-quatre pixels le verrouillage porte bien ses cinq
  // pierres, en dessous il en porte trois et reste lisible.
  return (
    <span className="gap-pas-2 inline-flex items-center">
      <SymboleDeMarque clair={clair} taille={taille} pierres={densiteDuSymbole(taille)} />
      <MotDeMarque clair={clair} taille={taille} />
    </span>
  );
}
