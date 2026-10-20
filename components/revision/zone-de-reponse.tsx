"use client";

import { CorrectionFermee } from "@/components/revision/correction-fermee";
import { ReponseCloze } from "@/components/revision/reponse-cloze";
import { ReponseFermee } from "@/components/revision/reponse-fermee";
import { ReponseOuverte } from "@/components/revision/reponse-ouverte";
import type { TexteATrou } from "@/components/revision/use-suite-de-questions";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le seul endroit qui connaît les formats. Une charge utile abîmée retombe sur
 * la question ouverte plutôt que de bloquer : on peut toujours se juger sur l'étalon.
 */
export function ZoneDeReponse({
  question,
  choisi,
  revelee,
  trou,
  enCours,
  dernier,
  onChoisir,
  onReveler,
  onVerifier,
  onNoter,
}: {
  question: QuestionServie;
  choisi: number | null;
  revelee: boolean;
  trou: TexteATrou;
  enCours: boolean;
  dernier: boolean;
  onChoisir: (index: number) => void;
  onReveler: () => void;
  onVerifier: () => void;
  onNoter: (note: ReviewRating) => void;
}) {
  if (question.options && question.correctIndex !== null) {
    const correctIndex = question.correctIndex;

    return (
      <>
        <ReponseFermee
          options={question.options}
          correctIndex={correctIndex}
          choisi={choisi}
          onChoisir={onChoisir}
        />
        {choisi !== null ? (
          <CorrectionFermee
            juste={choisi === correctIndex}
            answerKey={question.answerKey}
            bonneOption={question.options[correctIndex] ?? ""}
            enCours={enCours}
            dernier={dernier}
            onSuite={() => onNoter(choisi === correctIndex ? "GOOD" : "AGAIN")}
          />
        ) : null}
      </>
    );
  }

  if (question.cloze) {
    return (
      // Il note lui-même par `trou.juger`, qui retire un cran si l'aide a servi.
      <ReponseCloze trou={trou} enCours={enCours} dernier={dernier} onVerifier={onVerifier} />
    );
  }

  return (
    <ReponseOuverte
      answerKey={question.answerKey}
      revelee={revelee}
      enCours={enCours}
      onReveler={onReveler}
      onSeJuger={onNoter}
    />
  );
}
