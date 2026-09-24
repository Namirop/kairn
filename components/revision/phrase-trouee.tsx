import { Fragment, type ReactNode } from "react";
import { JETON, jetonInsecable } from "@/components/typographie/texte-technique";
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

/**
 * Les surfaces sur lesquelles un trou peut se creuser.
 *
 * Un creux est une **ombre**, et une ombre ne va pas dans le même sens selon la
 * lumière. Sur du clair, le trou est plus sombre que ce qui l'entoure ; sur la
 * dalle sombre de la fenêtre de l'essai, il l'est encore — mais il lui faut
 * descendre jusqu'à `stone-900`, sinon il remonte vers le clair et se lit comme
 * un surlignage plutôt que comme un manque.
 *
 * `ombre` sert aussi de repli sur du papier quand le trou tombe dans un jeton de
 * code : l'encre diluée du jeton mange le gris du papier, et il faut le cran de
 * plus pour que le creux se voie.
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
        // Le creux est une ombre sur le papier de la carte de révision. Posé sur
        // une carte d'ombre — la vitrine de l'essai — il disparaîtrait dans son
        // propre fond : il lui faut alors le cran de plus qui sert déjà dans un
        // jeton, pour la même raison.
        className={`rounded-champ mx-[0.14em] inline-block h-[0.96em] w-[2.9em] translate-y-[0.06em] align-baseline ${CREUX[fond === "papier" && dansDuCode ? "ombre" : fond]}`}
      />
    );
  }

  // Le terme prend la place du trou, souligné de lichen : c'est le mot qu'on est
  // venu chercher, et l'accent est là pour le signaler.
  return <span className="border-lichen mx-[0.06em] border-b-2 px-[0.1em]">{comble}</span>;
}

export function PhraseTrouee({
  phrase,
  comble,
  fond = "papier",
}: {
  phrase: string;
  comble: string | null;
  /** La surface qui porte la phrase. Le creux s'y creuse dans le bon sens. */
  fond?: FondDuTrou;
}) {
  return (
    <>
      {segmentsDeCode(phrase).map((segment, rang) => {
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
          // Un jeton court ne se coupe pas en bout de ligne, qu'il porte un trou
          // ou non : deux cadres pleins se lisent comme deux termes, et la moitié
          // d'un terme troué se retrouve au-dessus de son emplacement. Voir
          // `jetonInsecable`.
          //
          // **Un jeton long se coupe, même troué.** Il ne l'a pas toujours fait,
          // et c'est le seul extrait de plusieurs mots du produit qui en a
          // souffert : `function dernier(valeurs) { return ___; }` tenait sur une
          // ligne insécable de quarante signes, donc il sortait de la carte par la
          // droite sur un téléphone — on lisait la moitié d'une question. Un trou
          // qui ouvre la ligne suivante est un défaut de composition ; un énoncé
          // coupé au milieu n'est plus un énoncé.
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
