import { Fragment } from "react";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";
import { releverLeCodeCite } from "@/lib/domain/code-sous-guillemets";
import { segmentsDeCode } from "@/lib/domain/texte-code";
import { segmentsEnGras } from "@/lib/domain/texte-en-gras";

/**
 * Un texte dont les termes de code sont relevés en jetons.
 *
 * Les mesures du jeton sont en `em` : il sert aussi bien dans un titre de 40 px
 * que dans une ligne de corps. Le poids est fixé plutôt qu'hérité : dans un
 * titre en gras, un jeton en gras se lit comme un pâté.
 *
 * `box-decoration-break: clone` donne à chaque morceau d'un extrait coupé son
 * cadre entier, au lieu d'un cadre fendu. `break-words` empêche un identifiant
 * plus large que sa colonne de déborder.
 *
 * L'interligne à 1,7 empêche deux jetons de lignes consécutives de se
 * chevaucher : un `line-height` réduit ne rétrécit pas la boîte peinte d'un
 * élément en ligne (métriques de fonte + rembourrage + bordure), il ne fait que
 * réserver la place dans la ligne. À 1,7, la ligne loge la hauteur peinte plus
 * quelques pixels d'air, à toutes les tailles puisque tout est en `em`. Baisser
 * cet interligne, ou monter le rembourrage, rouvre le chevauchement.
 */
export const JETON =
  "rounded-champ bg-jeton border border-jeton-bord font-mono text-[0.86em] font-medium leading-[1.7] px-[0.36em] py-[0.06em] [box-decoration-break:clone] break-words";

/**
 * Au-delà, un jeton ne tient plus sur la ligne la plus étroite du produit : un
 * énoncé de révision sur un téléphone de 390 points laisse un peu plus de vingt
 * signes de mono par ligne.
 */
const SIGNES_INSECABLES = 20;

/**
 * Le jeton court ne se coupe pas : un trait d'union (`s-maxage=300`) est une
 * occasion de coupure, et avec le cadre cloné on lirait deux termes là où il
 * n'y en a qu'un. Les longs extraits, eux, gardent la coupure.
 */
export function jetonInsecable(terme: string): boolean {
  return terme.trim().length <= SIGNES_INSECABLES;
}

/** Les termes de code d'un morceau de texte, relevés en jetons. */
function Jetons({ texte }: { texte: string }) {
  return (
    <>
      {/*
        Le relevé passe avant le découpage, et jamais dans un extrait en bloc :
        ce qu'un dépôt écrit entre trois accents graves est recopié tel quel,
        guillemets compris. Voir `releverLeCodeCite`.
      */}
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
 * Le gras se découpe en premier, les jetons à l'intérieur. Dans l'ordre
 * inverse, un passage en gras qui contient un terme de code voit ses marques
 * ouvrante et fermante tomber dans deux morceaux différents, et les astérisques
 * s'affichent. `segmentsEnGras` ignore déjà une marque écrite dans un terme cité.
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
 * L'extrait de plusieurs lignes, réduit à un jeton, faute de mieux.
 *
 * Ce composant vit en ligne (titre de carte, option de QCM, aperçu) ; le bloc
 * de code se rend dans `TexteRiche`. Mais `segmentsDeCode` ne connaît que la
 * paire d'accents en ligne et éclaterait une barrière de trois accents en
 * plusieurs cadres : un seul jeton pour tout l'extrait reste lisible.
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
