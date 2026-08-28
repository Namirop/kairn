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
 * **Sa hauteur peinte tient dans la ligne, et c'est une contrainte, pas un
 * réglage.** Le rembourrage vertical d'un élément en ligne n'agrandit pas la
 * ligne : il déborde par-dessus les voisines. Sur un énoncé de deux lignes
 * serrées à `leading-tight`, deux jetons de lignes consécutives se
 * chevauchaient donc, et le cadre de l'un traversait les lettres de l'autre.
 *
 * L'interligne du jeton est fixé plutôt qu'hérité, et son rembourrage descendu :
 * l'ensemble — texte, rembourrage, bordure — reste sous 1,2 em, ce qui passe
 * dans les 1,25 em du titre le plus serré du produit. Toute augmentation de ces
 * trois valeurs rouvre le défaut ; c'est de l'interligne de l'énoncé qu'il faut
 * partir si un jeton doit grossir.
 */
export const JETON =
  "rounded-champ bg-jeton border border-jeton-bord font-mono text-[0.86em] font-medium leading-[1.15] px-[0.36em] py-[0.06em] [box-decoration-break:clone] break-words";

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
