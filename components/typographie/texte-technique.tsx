import { Fragment } from "react";
import { segmentsDeCode } from "@/lib/domain/texte-code";

/**
 * Un texte dont les termes de code sont relevés.
 *
 * Ce qu'on lisait avant : « Jusqu'où porte un `"use client"` placé en haut d'un
 * fichier ? », accents graves compris, au milieu d'un titre. La convention
 * d'écriture arrivait jusqu'à l'écran sans être lue par personne, et le terme
 * qu'elle devait relever ressortait moins que la ponctuation qui l'entourait.
 *
 * Le jeton est en mono — c'est le rôle « données » de l'échelle typographique,
 * et un nom de fonction en est —, sur un fond d'encre diluée qui tient aussi
 * bien sur le papier que sur l'ombre. Ses mesures sont en `em` : le même
 * composant sert dans un titre de quarante pixels et dans une ligne de corps,
 * et un jeton calé en pixels serait minuscule dans l'un et énorme dans l'autre.
 *
 * Le poids est fixé plutôt qu'hérité : dans un titre en gras, un jeton en gras
 * se lit comme un pâté.
 *
 * `box-decoration-break: clone` est là pour le jour où un long extrait passe la
 * fin d'une ligne : sans lui, le fond et la bordure se fendent en deux moitiés
 * ouvertes, et le jeton a l'air cassé. Avec, chaque morceau est un jeton entier.
 * `break-words` couvre le cas pire — un identifiant plus large que sa colonne
 * débordait la carte au lieu de se couper.
 *
 * **C'est le jeton qui ouvre sa ligne, et c'est son interligne qui le fait.**
 * Deux jetons de lignes consécutives se chevauchaient : sur un énoncé de
 * téléphone à vingt-quatre pixels serré à `leading-tight`, la ligne fait trente
 * pixels et le jeton en peint trente et demi — le cadre de l'un traversait
 * l'autre. Mesuré, pas déduit.
 *
 * Le réglage précédent partait d'une idée fausse : un `line-height` réduit ne
 * rétrécit **pas** la boîte peinte d'un élément en ligne. Cette boîte vaut les
 * métriques de la fonte plus le rembourrage et la bordure, et rien d'autre ne
 * l'atteint. L'interligne, lui, décide de la place que le jeton **réclame dans
 * la ligne** : monté à 1,7, il ouvre de quoi loger sa propre hauteur peinte et
 * quatre pixels d'air, et il n'ouvre que les lignes qui en portent un.
 *
 * La proportion se conserve à toutes les tailles — la hauteur peinte comme la
 * place réclamée se mesurent en `em` du corps qui les porte —, donc une seule
 * valeur suffit du téléphone au grand écran. Baisser cet interligne, ou monter
 * le rembourrage, rouvre le défaut.
 */
export const JETON =
  "rounded-champ bg-jeton border border-jeton-bord font-mono text-[0.86em] font-medium leading-[1.7] px-[0.36em] py-[0.06em] [box-decoration-break:clone] break-words";

export function TexteTechnique({ children }: { children: string }) {
  return (
    <>
      {segmentsDeCode(children).map((segment, rang) =>
        segment.code ? (
          <code key={rang} className={JETON}>
            {segment.texte}
          </code>
        ) : (
          <Fragment key={rang}>{segment.texte}</Fragment>
        ),
      )}
    </>
  );
}
