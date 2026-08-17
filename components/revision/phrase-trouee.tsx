import { Fragment, type ReactNode } from "react";
import { JETON } from "@/components/typographie/texte-technique";
import { segmentsDeCode } from "@/lib/domain/texte-code";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La phrase d'un texte à trou : son trou vide, comblé de ce qu'on saisit, ou du
 * terme attendu une fois la réponse vérifiée.
 *
 * Elle se compose en ligne, dans l'énoncé, et pas dans un paragraphe à elle :
 * c'est la question, et elle n'est dite qu'une fois.
 *
 * Le découpage passe par les termes de code **avant** de chercher le trou, et
 * l'ordre inverse cassait tout : sur « on écrit `valeurs.___` », couper d'abord
 * au trou laissait un accent grave orphelin de chaque côté, donc deux accents
 * affichés tels quels et pas de jeton. Le trou peut se trouver dans un terme de
 * code — c'est même le cas intéressant, celui où l'on masque un appel — et il se
 * creuse alors dans le jeton.
 *
 * Ses mesures sont en `em`. Le même composant sert dans un titre de quarante
 * pixels comme dans une ligne de corps, et un emplacement calé en pixels y
 * serait un trait perdu dans un cas et une barre dans l'autre.
 */

/** L'emplacement vide, ou le terme qui l'a comblé. */
function Trou({ comble, dansDuCode }: { comble: string | null; dansDuCode: boolean }) {
  if (comble === null) {
    // Un emplacement, pas un soulignement : c'est le geste central de ce format,
    // et un trait fin sous une ligne de texte se remarquait à peine. Dans un
    // jeton, l'encre diluée du fond mange le gris de l'ombre : il en faut un cran
    // de plus pour que le creux se voie.
    //
    // Sa hauteur est celle d'une capitale, sa largeur celle de trois lettres :
    // c'est un mot manquant, et un mot est plus haut que long. Large et plat, il
    // redevenait le trait qu'on voulait éviter — la forme disait « souligne ici »
    // là où elle doit dire « il manque un terme ».
    return (
      <span
        aria-hidden
        className={`rounded-champ mx-[0.14em] inline-block h-[0.96em] w-[2.9em] translate-y-[0.06em] align-baseline ${
          dansDuCode ? "bg-stone-300" : "bg-surface-ombre"
        }`}
      />
    );
  }

  // Le terme prend la place du trou, souligné de lichen : c'est le mot qu'on est
  // venu chercher, et l'accent est là pour le signaler.
  return <span className="border-lichen mx-[0.06em] border-b-2 px-[0.1em]">{comble}</span>;
}

export function PhraseTrouee({ phrase, comble }: { phrase: string; comble: string | null }) {
  return (
    <>
      {segmentsDeCode(phrase).map((segment, rang) => {
        const [avant = "", ...suite] = segment.texte.split(TROU);
        const contenu: ReactNode =
          suite.length === 0 ? (
            segment.texte
          ) : (
            <>
              {avant}
              <Trou comble={comble} dansDuCode={segment.code} />
              {suite.join(TROU)}
            </>
          );

        return segment.code ? (
          // Un jeton qui porte le trou ne se coupe pas en bout de ligne : la
          // moitié du terme restait au-dessus de son emplacement, avec un fond de
          // jeton fendu en deux.
          <code key={rang} className={`${JETON} ${suite.length === 0 ? "" : "whitespace-nowrap"}`}>
            {contenu}
          </code>
        ) : (
          <Fragment key={rang}>{contenu}</Fragment>
        );
      })}
    </>
  );
}
