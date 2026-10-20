import { Fragment, type ReactNode } from "react";
import { JETON, jetonInsecable } from "@/components/typographie/texte-technique";
import { releverLeCodeCite } from "@/lib/domain/code-sous-guillemets";
import { segmentsDeCode } from "@/lib/domain/texte-code";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La phrase d'un texte à trou. Le code se découpe avant de chercher le trou :
 * dans l'ordre inverse, « `valeurs.___` » laisserait deux accents graves
 * orphelins au lieu d'un jeton troué. Mesures en `em` : sert en titre comme en corps.
 */

/**
 * Le creux est toujours plus sombre que son fond, sinon il se lit comme un
 * surlignage. `ombre` sert aussi sur papier dans un jeton de code, dont l'encre
 * diluée mange le gris du papier.
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
    // Haut d'une capitale, large de trois lettres : plus plat, il se lirait comme un soulignement.
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
      {/* Relevé avant découpage, comme dans `TexteTechnique` : le modèle écrit
          aussi ici les termes de code entre guillemets. */}
      {segmentsDeCode(releverLeCodeCite(phrase)).map((segment, rang) => {
        // Parfois deux trous : la lecture creuse le terme réécrit en clair dans
        // la phrase, le même mot deux fois. Voir `phraseSansDevoilement`.
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
          // Court, insécable (coupé, il se lit comme deux termes) ; long, il se
          // coupe, sinon il sort de la carte sur téléphone. Voir `jetonInsecable`.
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
