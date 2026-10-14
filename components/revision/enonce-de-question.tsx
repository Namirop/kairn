import { PhraseTrouee } from "@/components/revision/phrase-trouee";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { QuestionServie } from "@/lib/db/question-servie";
import { blocsDeTexte, porteDuCodeEnBloc } from "@/lib/domain/blocs-de-texte";

/**
 * Ce que la carte pose en titre.
 *
 * Pour presque tous les formats, c'est l'énoncé écrit à la génération. Le texte
 * à trou fait exception : sa phrase, avec son trou, est l'énoncé. Son champ
 * `question` n'est jamais lu — il redit la phrase, et sa forme varie d'une
 * génération à l'autre.
 *
 * Un extrait de code entre trois accents graves descend sous l'énoncé, dans
 * `BlocDeCode` : en ligne, `TexteTechnique` en ferait un seul jeton dont les
 * retours à la ligne s'effondrent en espaces. Sans barrière, le rendu reste
 * celui de `TexteTechnique`, sans découpe.
 */

/**
 * Le titre de la carte. `break-words` retient les saisies absurdes dans la
 * carte. Centré sur téléphone, où une dernière ligne courte ferait pencher la
 * carte ; aligné à gauche dès `md`.
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
          // L'extrait vient après toute la prose qui l'annonce : une question
          // pose sa consigne puis montre l'extrait.
          <div key={rang} className="mt-pas-4 text-left">
            <BlocDeCode texte={bloc.texte} langage={bloc.langage} />
          </div>
        ) : null,
      )}
    </>
  );
}
