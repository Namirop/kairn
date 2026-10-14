import { Fragment, type ReactNode } from "react";
import { JETON, jetonInsecable } from "@/components/typographie/texte-technique";
import { releverLeCodeCite } from "@/lib/domain/code-sous-guillemets";
import { segmentsDeCode } from "@/lib/domain/texte-code";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La phrase d'un texte à trou : son trou vide, comblé de ce qu'on saisit, ou du
 * terme attendu une fois la réponse vérifiée.
 *
 * Le découpage en termes de code passe avant la recherche du trou : dans
 * l'ordre inverse, « `valeurs.___` » laisserait deux accents graves orphelins
 * au lieu d'un jeton. Le trou peut ainsi se creuser dans un jeton.
 *
 * Les mesures sont en `em` : le même composant sert dans un titre et dans une
 * ligne de corps.
 */

/**
 * Les surfaces sur lesquelles un trou peut se creuser. Le creux est toujours
 * plus sombre que son fond ; sur la roche il descend jusqu'à `stone-900`, sinon
 * il se lit comme un surlignage. `ombre` sert aussi sur du papier quand le trou
 * tombe dans un jeton de code, dont l'encre diluée mange le gris du papier.
 */
export type FondDuTrou = "papier" | "ombre" | "roche";

const CREUX: Record<FondDuTrou, string> = {
  papier: "bg-surface-ombre",
  ombre: "bg-stone-300",
  roche: "bg-stone-900",
};

/** L'emplacement vide, ou le terme qui l'a comblé. */
function Trou({
  comble,
  dansDuCode,
  fond,
}: {
  comble: string | null;
  dansDuCode: boolean;
  fond: FondDuTrou;
}) {
  if (comble === null) {
    // Un emplacement de la hauteur d'une capitale et de la largeur de trois
    // lettres : plus large et plat, il se lirait comme un soulignement.
    return (
      <span
        aria-hidden
        className={`rounded-champ mx-[0.14em] inline-block h-[0.96em] w-[2.9em] translate-y-[0.06em] align-baseline ${CREUX[fond === "papier" && dansDuCode ? "ombre" : fond]}`}
      />
    );
  }

  return <span className="border-lichen-deep mx-[0.06em] border-b-2 px-[0.1em]">{comble}</span>;
}

export function PhraseTrouee({
  phrase,
  comble,
  fond = "papier",
}: {
  phrase: string;
  comble: string | null;
  /** La surface qui porte la phrase, pour que le creux s'y voie. */
  fond?: FondDuTrou;
}) {
  return (
    <>
      {/*
        Le relevé passe avant le découpage, comme dans `TexteTechnique` : une
        phrase trouée cite les mêmes termes que l'énoncé qui l'entoure, et le
        modèle les écrit entre guillemets. Voir `releverLeCodeCite`.
      */}
      {segmentsDeCode(releverLeCodeCite(phrase)).map((segment, rang) => {
        // Un segment porte d'ordinaire un seul trou — mais la lecture en creuse
        // un second quand la phrase réécrivait le terme en clair, et c'est alors
        // le même mot à retrouver deux fois. Voir `phraseSansDevoilement`.
        const morceaux = segment.texte.split(TROU);
        const contenu: ReactNode =
          morceaux.length === 1
            ? segment.texte
            : morceaux.map((morceau, place) => (
                <Fragment key={place}>
                  {place > 0 ? (
                    <Trou comble={comble} dansDuCode={segment.code} fond={fond} />
                  ) : null}
                  {morceau}
                </Fragment>
              ));

        return segment.code ? (
          // Un jeton court ne se coupe pas en bout de ligne : coupé, il se lit
          // comme deux termes. Un jeton long se coupe, même troué — insécable, il
          // sortirait de la carte sur un téléphone. Voir `jetonInsecable`.
          <code
            key={rang}
            className={`${JETON} ${jetonInsecable(segment.texte) ? "whitespace-nowrap" : ""}`}
          >
            {contenu}
          </code>
        ) : (
          <Fragment key={rang}>{contenu}</Fragment>
        );
      })}
    </>
  );
}
