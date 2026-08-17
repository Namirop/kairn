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
 */
export const JETON =
  "rounded-champ bg-jeton border border-jeton-bord font-mono text-[0.86em] font-medium px-[0.36em] py-[0.1em]";

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
