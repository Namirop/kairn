"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CarteQuestion } from "@/components/revision/carte-question";
import { CorrectionFermee } from "@/components/revision/correction-fermee";
import { ReponseCloze } from "@/components/revision/reponse-cloze";
import { ReponseFermee } from "@/components/revision/reponse-fermee";
import { ReponseOuverte } from "@/components/revision/reponse-ouverte";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le déroulé d'une suite de questions, commun aux deux modes.
 *
 * Il ne sait rien de ce qu'on écrit derrière : il pose une question, mesure le
 * temps, et rend la note. La session du jour replanifie, l'entraînement libre
 * ne touche à rien — ça se décide dans `onRepondre`, pas ici.
 *
 * Le chronomètre part à l'affichage et se fige à la validation : le choix d'une
 * option, la vérification d'un trou, la demande de l'étalon. Lire la correction
 * n'entre pas dans la mesure, sans quoi le signal le plus précieux du produit
 * serait pollué par le temps de lecture.
 */

export type PassageDonne = {
  question: QuestionServie;
  note: ReviewRating;
  tempsMs: number;
  /** La personne a déclaré maîtriser le concept. Session du jour seulement. */
  maitrise: boolean;
};

/** Écrit le passage et enchaîne. Ce qu'un mode ajoute sous la carte s'en sert. */
export type Valider = (note: ReviewRating, maitrise?: boolean) => Promise<void>;

export function DerouleQuestions({
  questions,
  onRepondre,
  onFini,
  actions,
}: {
  questions: QuestionServie[];
  /** Rend `true` si le passage a bien été écrit ; l'écran avance alors. */
  onRepondre: (passage: PassageDonne) => Promise<boolean>;
  onFini: (revus: number) => void;
  /** Ce que ce mode-là autorise sous la question. Rien, par défaut. */
  actions?: (contexte: {
    question: QuestionServie;
    enCours: boolean;
    valider: Valider;
  }) => ReactNode;
}) {
  const [rang, setRang] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [revelee, setRevelee] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [ecrit, setEcrit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revus, setRevus] = useState(0);

  const debut = useRef(Date.now());
  const fige = useRef<number | null>(null);

  const question = questions[rang];

  useEffect(() => {
    debut.current = Date.now();
    fige.current = null;
  }, [rang]);

  const arreter = useCallback(() => {
    fige.current ??= Date.now() - debut.current;
  }, []);

  const enregistrer = useCallback(
    async (note: ReviewRating, maitrise = false): Promise<boolean> => {
      if (!question || enCours) return false;

      arreter();
      setEnCours(true);
      setErreur(null);

      const ok = await onRepondre({ question, note, tempsMs: fige.current ?? 0, maitrise });

      setEnCours(false);

      if (!ok) {
        setErreur("Ce passage n'a pas pu être enregistré. Réessaie.");
        return false;
      }

      setRevus((compte) => compte + 1);
      setEcrit(true);

      return true;
    },
    [arreter, enCours, onRepondre, question],
  );

  const avancer = useCallback(
    (comptes: number) => {
      if (rang + 1 >= questions.length) {
        onFini(comptes);
        return;
      }

      setChoisi(null);
      setRevelee(false);
      setEcrit(false);
      setRang(rang + 1);
    },
    [onFini, questions.length, rang],
  );

  if (!question) return null;

  const ferme = question.options !== null && question.correctIndex !== null;

  const suivre: Valider = async (note, maitrise = false) => {
    // Sur un format fermé, le passage est parti au clic sur l'option ; s'il a
    // échoué, on retente avant d'avancer plutôt que de laisser filer une
    // réponse donnée.
    if (ecrit && !maitrise) {
      avancer(revus);
      return;
    }

    if (await enregistrer(note, maitrise)) avancer(revus + 1);
  };

  return (
    <CarteQuestion
      rang={rang}
      total={questions.length}
      facet={question.facet}
      tags={question.tags}
      question={question.question}
      actions={actions?.({ question, enCours, valider: suivre })}
    >
      {ferme && question.options && question.correctIndex !== null ? (
        <>
          <ReponseFermee
            options={question.options}
            correctIndex={question.correctIndex}
            choisi={choisi}
            onChoisir={(index) => {
              if (choisi !== null) return;

              arreter();
              setChoisi(index);
              void enregistrer(index === question.correctIndex ? "GOOD" : "AGAIN");
            }}
          />
          {choisi !== null ? (
            <CorrectionFermee
              juste={choisi === question.correctIndex}
              answerKey={question.answerKey}
              bonneOption={question.options[question.correctIndex] ?? ""}
              enCours={enCours}
              dernier={rang + 1 >= questions.length}
              onSuite={() => void suivre(choisi === question.correctIndex ? "GOOD" : "AGAIN")}
            />
          ) : null}
        </>
      ) : question.cloze ? (
        <ReponseCloze
          key={question.variantId}
          sentence={question.cloze.sentence}
          accepted={question.cloze.accepted}
          enCours={enCours}
          onValider={arreter}
          onJuger={(note) => void suivre(note)}
        />
      ) : (
        <ReponseOuverte
          answerKey={question.answerKey}
          revelee={revelee}
          enCours={enCours}
          onReveler={() => {
            arreter();
            setRevelee(true);
          }}
          onSeJuger={(note) => void suivre(note)}
        />
      )}

      {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
      <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>
    </CarteQuestion>
  );
}
