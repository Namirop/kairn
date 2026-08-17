"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CarteQuestion } from "@/components/revision/carte-question";
import { enonceDeCarte } from "@/components/revision/enonce-de-carte";
import { JeterLaPierre } from "@/components/revision/jeter-la-pierre";
import { PierreJetee } from "@/components/revision/pierre-jetee";
import { reponseDeSecours } from "@/components/revision/reponse-de-secours";
import { useChronometre } from "@/components/revision/use-chronometre";
import { ZoneDeReponse } from "@/components/revision/zone-de-reponse";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le déroulé d'une suite de questions, commun aux deux modes.
 *
 * Il ne sait rien de ce qu'on écrit derrière : il pose une question, mesure le
 * temps, et rend la note. La session du jour replanifie, l'entraînement libre
 * ne touche à rien — ça se décide dans `onRepondre`, pas ici. Il ne sait rien
 * non plus des formats : c'est `ZoneDeReponse` qui décide qu'un QCM se clique
 * et qu'un texte à trou se saisit.
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
  chiffree,
  onRepondre,
  onFini,
  onAvance,
  actions,
}: {
  questions: QuestionServie[];
  /** Le compte de la session. L'entraînement ne tient pas de longueur. */
  chiffree?: boolean;
  /** Rend `true` si le passage a bien été écrit ; l'écran avance alors. */
  onRepondre: (passage: PassageDonne) => Promise<boolean>;
  onFini: (revus: number) => void;
  /** Combien de questions sont passées, pour ce que le mode montre à côté. */
  onAvance?: (faites: number) => void;
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
  // Une réponse a été produite : le geste de renoncement n'a plus de sens.
  const [engage, setEngage] = useState(false);
  const [jetee, setJetee] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [ecrit, setEcrit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revus, setRevus] = useState(0);

  const question = questions[rang];
  const chronometre = useChronometre(rang);

  const arreter = useCallback(() => {
    chronometre.arreter();
    setEngage(true);
  }, [chronometre]);

  const enregistrer = useCallback(
    async (note: ReviewRating, maitrise = false): Promise<boolean> => {
      if (!question || enCours) return false;

      arreter();
      setEnCours(true);
      setErreur(null);

      const ok = await onRepondre({ question, note, tempsMs: chronometre.mesure(), maitrise });

      setEnCours(false);

      if (!ok) {
        setErreur("Ce passage n'a pas pu être enregistré. Réessaie.");
        return false;
      }

      setRevus((compte) => compte + 1);
      setEcrit(true);

      return true;
    },
    [arreter, chronometre, enCours, onRepondre, question],
  );

  const avancer = useCallback(
    (comptes: number) => {
      onAvance?.(rang + 1);

      if (rang + 1 >= questions.length) {
        onFini(comptes);
        return;
      }

      setChoisi(null);
      setRevelee(false);
      setEngage(false);
      setJetee(false);
      setEcrit(false);
      setRang(rang + 1);
    },
    [onAvance, onFini, questions.length, rang],
  );

  if (!question) return null;

  const dernier = rang + 1 >= questions.length;

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
      chiffree={chiffree}
      tags={question.tags}
      question={enonceDeCarte(question)}
      vuIlYaJours={question.vuIlYaJours}
      variantId={question.variantId}
      actions={actions?.({ question, enCours, valider: suivre })}
    >
      {jetee ? (
        <PierreJetee
          {...reponseDeSecours(question)}
          enCours={enCours}
          dernier={dernier}
          onSuite={() => void suivre("AGAIN")}
        />
      ) : (
        <>
          <ZoneDeReponse
            question={question}
            choisi={choisi}
            revelee={revelee}
            enCours={enCours}
            dernier={dernier}
            onChoisir={(index) => {
              if (choisi !== null) return;

              arreter();
              setChoisi(index);
              void enregistrer(index === question.correctIndex ? "GOOD" : "AGAIN");
            }}
            onEngager={arreter}
            onReveler={() => {
              arreter();
              setRevelee(true);
            }}
            onNoter={(note) => void suivre(note)}
          />

          {engage ? null : (
            <JeterLaPierre
              enCours={enCours}
              onJeter={() => {
                setJetee(true);
                void enregistrer("AGAIN");
              }}
            />
          )}
        </>
      )}

      {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
      <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>
    </CarteQuestion>
  );
}
