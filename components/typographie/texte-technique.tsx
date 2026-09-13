import { Fragment } from "react";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";
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

/**
 * Au-delà, un jeton ne tient plus sur la ligne la plus étroite du produit.
 *
 * Mesuré sur ce qu'il y a de plus serré : un énoncé de révision sur un téléphone
 * de trois cent quatre-vingt-dix points, où la carte laisse un peu plus de vingt
 * signes de mono à une ligne. En dessous du seuil, un jeton qui se coupe se
 * coupe **par choix de la mise en page** et non par manque de place — et c'est
 * ce choix-là qu'on retire.
 */
const SIGNES_INSECABLES = 20;

/**
 * Le jeton court ne se coupe pas.
 *
 * `s-maxage=300` porte un trait d'union, et un trait d'union est une occasion de
 * coupure ordinaire : la fin de ligne emportait « s- » et laissait
 * « maxage=300 » à la ligne suivante. Avec `box-decoration-break: clone`, chaque
 * moitié reçoit son cadre entier — on lisait deux termes là où il y en a un, et
 * la question portait sur celui-là.
 *
 * On ne renonce pas au cadre cloné pour autant : c'est lui qui sauve les longs
 * extraits, où la coupure est inévitable et où deux cadres pleins valent mieux
 * qu'un cadre fendu. On retire la coupure là où elle n'était pas nécessaire,
 * c'est-à-dire presque partout — un nom de directive, un identifiant, un appel
 * de méthode tiennent tous sous le seuil.
 */
export function jetonInsecable(terme: string): boolean {
  return terme.trim().length <= SIGNES_INSECABLES;
}

function Segments({ texte }: { texte: string }) {
  return (
    <>
      {segmentsDeCode(texte).map((segment, rang) =>
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
 * L'extrait de plusieurs lignes, réduit à un jeton, faute de mieux.
 *
 * Ce composant vit en ligne : dans un titre de carte, dans une option de QCM,
 * dans un aperçu coupé à deux lignes. Un extrait en bloc n'y a pas sa place —
 * c'est `TexteRiche` qui le rend, là où le contenu est de la lecture au long.
 *
 * Mais il peut en arriver un, et il faut alors qu'il se lise. `segmentsDeCode`
 * ne connaît que la paire d'accents en ligne : trois accents graves lui font
 * voir le nom du langage dans un cadre, la première ligne dans un autre, et le
 * mot resté au bout dans un troisième. Un seul jeton pour tout l'extrait n'est
 * pas beau, mais il est juste — et c'est un état qu'aucun concept ni aucune
 * question de la production n'a encore connu.
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
  // Le chemin ordinaire est celui d'avant, au caractère près : le détour ne
  // s'ouvre que sur un texte qui porte vraiment une barrière, c'est-à-dire
  // jamais, jusqu'au jour où.
  if (porteDuCodeEnBloc(children)) return <ExtraitsEnLigne texte={children} />;

  return <Segments texte={children} />;
}
