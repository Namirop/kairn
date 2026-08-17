"use client";

import { CorrectionFermee } from "@/components/revision/correction-fermee";
import { ReponseCloze } from "@/components/revision/reponse-cloze";
import { ReponseFermee } from "@/components/revision/reponse-fermee";
import { ReponseOuverte } from "@/components/revision/reponse-ouverte";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le geste de réponse, choisi d'après le format de la question.
 *
 * Le déroulé ne sait rien des formats : il compte les questions, mesure le temps
 * et écrit les passages. C'est ici, et seulement ici, qu'on décide qu'un QCM se
 * clique, qu'un texte à trou se saisit et qu'une question ouverte se juge.
 *
 * Un format dont la charge utile est abîmée retombe sur la question ouverte
 * plutôt que de bloquer l'écran : on peut toujours se juger contre l'étalon.
 */
export function ZoneDeReponse({
  question,
  choisi,
  revelee,
  enCours,
  dernier,
  onChoisir,
  onEngager,
  onReveler,
  onNoter,
}: {
  question: QuestionServie;
  choisi: number | null;
  revelee: boolean;
  enCours: boolean;
  dernier: boolean;
  onChoisir: (index: number) => void;
  /** La personne a produit sa réponse : le chronomètre se fige ici. */
  onEngager: () => void;
  onReveler: () => void;
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
      <ReponseCloze
        key={question.variantId}
        accepted={question.cloze.accepted}
        enCours={enCours}
        onValider={onEngager}
        onJuger={onNoter}
      />
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
