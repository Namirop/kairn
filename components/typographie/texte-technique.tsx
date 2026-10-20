import { Fragment } from "react";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";
import { releverLeCodeCite } from "@/lib/domain/code-sous-guillemets";
import { segmentsDeCode } from "@/lib/domain/texte-code";
import { segmentsEnGras } from "@/lib/domain/texte-en-gras";

/**
 * Un texte dont les termes de code sont relevés en jetons.
 *
 * Tout en `em` : le jeton sert du titre de 40 px à la ligne de corps. Poids
 * fixé : un jeton gras dans un titre gras fait un pâté. `clone` donne son cadre
 * entier à chaque morceau d'un extrait coupé.
 *
 * L'interligne de 1,7 empêche deux jetons de lignes voisines de se chevaucher :
 * un `line-height` réduit ne rétrécit pas la boîte peinte d'un élément en ligne.
 * Le baisser, ou monter le rembourrage, rouvre le chevauchement.
 */
export const JETON =
  "rounded-champ bg-jeton border border-jeton-bord font-mono text-[0.86em] font-medium leading-[1.7] px-[0.36em] py-[0.06em] [box-decoration-break:clone] break-words";

/** Un énoncé de révision sur 390 points laisse un peu plus de vingt signes de mono. */
const SIGNES_INSECABLES = 20;

/**
 * Le jeton court ne se coupe pas : coupé au trait d'union (`s-maxage=300`), son
 * cadre cloné ferait lire deux termes. Les longs extraits gardent la coupure.
 */
export function jetonInsecable(terme: string): boolean {
  return terme.trim().length <= SIGNES_INSECABLES;
}

/** Les termes de code d'un morceau de texte, relevés en jetons. */
function Jetons({ texte }: { texte: string }) {
  return (
    <>
      {/* Le relevé passe avant le découpage, jamais dans un extrait en bloc,
          recopié tel quel. Voir `releverLeCodeCite`. */}
      {segmentsDeCode(releverLeCodeCite(texte)).map((segment, rang) =>
        segment.code ? (
          <code
            key={rang}
            className={jetonInsecable(segment.texte) ? `${JETON} whitespace-nowrap` : JETON}
          >
            {segment.texte}
          </code>
        ) : (
          <Fragment key={rang}>{segment.texte}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Le gras d'abord, les jetons dedans : dans l'ordre inverse, un gras contenant
 * du code verrait ses marques séparées, et les astérisques s'afficheraient.
 */
function Segments({ texte }: { texte: string }) {
  return (
    <>
      {segmentsEnGras(texte).map((segment, rang) =>
        segment.gras ? (
          <strong key={rang} className="font-semibold text-stone-900">
            <Jetons texte={segment.texte} />
          </strong>
        ) : (
          <Jetons key={rang} texte={segment.texte} />
        ),
      )}
    </>
  );
}

/**
 * L'extrait de plusieurs lignes réduit à un jeton : ce composant vit en ligne
 * (le bloc se rend dans `TexteRiche`), et `segmentsDeCode` éclaterait une
 * barrière de trois accents en plusieurs cadres.
 */
function ExtraitsEnLigne({ texte }: { texte: string }) {
  return (
    <>
      {blocsDeTexte(texte).map((bloc, rang) => (
        <Fragment key={rang}>
          {rang > 0 ? " " : null}
          {bloc.type === "code" ? (
            <code className={JETON}>{bloc.texte}</code>
          ) : (
            <Segments texte={bloc.texte} />
          )}
        </Fragment>
      ))}
    </>
  );
}

export function TexteTechnique({ children }: { children: string }) {
  if (porteDuCodeEnBloc(children)) return <ExtraitsEnLigne texte={children} />;

  return <Segments texte={children} />;
}
