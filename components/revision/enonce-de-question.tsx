import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { QuestionServie } from "@/lib/db/question-servie";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";

/**
 * Ce que la carte pose en titre. Pour le texte à trou, c'est la phrase trouée :
 * son champ `question` n'est jamais lu, il la redit sous une forme qui varie.
 *
 * Un bloc de code entre trois accents graves descend sous l'énoncé : en ligne,
 * `TexteTechnique` en ferait un seul jeton aux retours à la ligne effondrés.
 */

/**
 * `break-words` retient les saisies absurdes dans la carte. Centré sur
 * téléphone, où une dernière ligne courte ferait pencher la carte.
 */
const ENONCE =
  "text-enonce leading-tight font-bold text-pretty break-words text-stone-900 max-md:text-center";

export function EnonceDeQuestion({
  question,
  comble,
}: {
  question: QuestionServie;
  /** Remplit le trou d'un texte à trou ; ignoré des autres formats. */
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
          // Après toute la prose : la consigne d'abord, l'extrait ensuite.
          <div key={rang} className="mt-pas-4 text-left">
            <BlocDeCode texte={bloc.texte} langage={bloc.langage} />
          </div>
        ) : null,
      )}
    </>
  );
}
