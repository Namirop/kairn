import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { QuestionServie } from "@/lib/db/question-servie";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";

/**
 * Ce que la carte pose en titre.
 *
 * Pour presque tous les formats, c'est l'énoncé écrit à la génération. Le texte
 * à trou fait exception : sa phrase EST son énoncé. Le champ `question` que la
 * génération écrit à côté redit cette phrase, précédée d'un « Complète : », et
 * on lisait donc le même texte deux fois — une fois en titre, une fois au-dessus
 * du champ de saisie. C'est la phrase qui monte en titre, avec son trou, et le
 * trou se remplit à la frappe.
 *
 * On ne lit pas `question` sur ce format, même quand il ne redit rien : ce qu'il
 * porte varie d'une génération à l'autre, et une carte dont le titre change de
 * nature selon l'humeur du modèle ne se conçoit pas.
 *
 * **L'extrait cité en bloc est sorti du titre le 30 septembre 2026.** Une
 * question `CODE` en porte un — c'est sa définition, « montre un extrait court
 * et demande ce qu'il produit » — et il arrivait entre trois accents graves dans
 * le champ `question`. `TexteTechnique` n'a qu'un recours en ligne : il en fait
 * un seul jeton, dont les retours à la ligne s'effondrent en espaces. Servi le
 * 30/09, ça donnait `plugins { id("com.android.applicat` / `ion") version
 * "8.9.1" }` — trois lignes de Gradle tassées sur le moins de lignes possible,
 * centrées, coupées au milieu d'un identifiant, dans un titre en gras de vingt-
 * quatre points.
 *
 * Un extrait ne se lit pas comme une phrase : il se lit ligne à ligne,
 * l'indentation porte du sens, et personne n'apprend à lire du code dans une
 * forme qu'aucun éditeur ne montre. Il descend donc sous l'énoncé, dans le bloc
 * qui sert déjà aux dépôts — dalle de roche, lignes préservées, défilement
 * horizontal borné à son cadre, et le bouton qui l'ouvre en grand par-dessus la
 * page.
 *
 * Le détour ne s'ouvre que sur une question qui porte vraiment une barrière.
 * Partout ailleurs le rendu est celui d'avant, au caractère près : pas de
 * recollage de lignes, pas de découpe, rien.
 */

/**
 * Le titre de la carte.
 *
 * Les lignes se touchent presque : un titre est une unité, et l'écart du corps
 * de texte le faisait lire comme un paragraphe en gras. `text-enonce` est un
 * cran sous le titre de page — assez pour dominer l'écran, pas assez pour
 * l'occuper — et `break-words` retient les saisies absurdes dans la carte.
 *
 * **Centré sur téléphone.** Une colonne étroite laisse une dernière ligne courte
 * flotter contre le bord gauche, avec le vide de trois mots à sa droite : la
 * carte avait alors un côté plein et un côté creux, et l'écran penchait. Centré,
 * l'énoncé occupe sa carte comme un objet posé au milieu. Dès `md` la mesure est
 * assez longue pour que le drapeau à gauche redevienne le bon réglage.
 */
const ENONCE =
  "text-enonce leading-tight font-bold text-pretty break-words text-stone-900 max-md:text-center";

export function EnonceDeQuestion({
  question,
  comble,
}: {
  question: QuestionServie;
  /** Ce qui remplit le trou d'un texte à trou. Ignoré des autres formats. */
  comble: string | null;
}) {
  if (question.cloze) {
    return (
      <h1 className={ENONCE}>
        <PhraseTrouee phrase={question.cloze.sentence} comble={comble} />
      </h1>
    );
  }

  if (!porteDuCodeEnBloc(question.question)) {
    return (
      <h1 className={ENONCE}>
        <TexteTechnique>{question.question}</TexteTechnique>
      </h1>
    );
  }

  const blocs = blocsDeTexte(question.question);
  const dit = blocs.filter((bloc) => bloc.type === "prose");

  return (
    <>
      {dit.length > 0 ? (
        <h1 className={ENONCE}>
          {dit.map((bloc, rang) => (
            <TexteTechnique key={rang}>{bloc.texte}</TexteTechnique>
          ))}
        </h1>
      ) : null}

      {blocs.map((bloc, rang) =>
        bloc.type === "code" ? (
          // Il vient après ce qui l'annonce, jamais au milieu : une question
          // pose sa consigne puis montre l'extrait, et l'ordre des blocs du
          // modèle n'a jamais fait autre chose.
          <div key={rang} className="mt-pas-4 text-left">
            <BlocDeCode texte={bloc.texte} langage={bloc.langage} />
          </div>
        ) : null,
      )}
    </>
  );
}
