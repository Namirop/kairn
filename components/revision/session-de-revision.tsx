"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reclamerMaitriseAction, repondreAction } from "@/app/(app)/reviser/actions";
import { CarteQuestion } from "@/components/revision/carte-question";
import { CorrectionFermee } from "@/components/revision/correction-fermee";
import { FinDeSession } from "@/components/revision/fin-de-session";
import { ReponseFermee } from "@/components/revision/reponse-fermee";
import { ReponseOuverte } from "@/components/revision/reponse-ouverte";
import type { QuestionDeSession } from "@/lib/db/session-du-jour";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le déroulé d'une session.
 *
 * Le chronomètre part à l'affichage de la question et se fige à la validation —
 * le choix d'une option, ou la demande de l'étalon. Tout ce qui suit, lire la
 * correction et enchaîner, n'entre plus dans la mesure. C'est le signal le plus
 * précieux de cette phase, et il ne survit pas à une mesure polluée.
 *
 * Chaque passage part au serveur avant que le suivant s'affiche : une session
 * fermée en cours de route garde tout ce qui a été répondu.
 */

/** Un format fermé porte ses options ; un format ouvert n'en a pas. */
function estFerme(question: QuestionDeSession): boolean {
  return question.options !== null && question.correctIndex !== null;
}

export function SessionDeRevision({ questions }: { questions: QuestionDeSession[] }) {
  const [rang, setRang] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [revelee, setRevelee] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [revus, setRevus] = useState(0);
  const [carte, setCarte] = useState<{ atomId: string; concept: string } | null>(null);

  const debut = useRef(Date.now());
  const fige = useRef<number | null>(null);
  // Une ref plutôt qu'un état : la fin de session la lit dans la foulée du
  // dernier envoi, avant qu'un rendu ait eu lieu.
  const eligibles = useRef<string[]>([]);

  const question = questions[rang];

  useEffect(() => {
    debut.current = Date.now();
    fige.current = null;
  }, [rang]);

  const arreter = useCallback(() => {
    fige.current ??= Date.now() - debut.current;
  }, []);

  const terminer = useCallback(async () => {
    const reclamee =
      eligibles.current.length > 0 ? await reclamerMaitriseAction(eligibles.current) : null;

    setCarte(reclamee);
    setTermine(true);
  }, []);

  const envoyer = useCallback(
    async (note: ReviewRating, maitrise = false) => {
      if (!question || enCours) return;

      arreter();
      setEnCours(true);
      setErreur(null);

      const resultat = await repondreAction({
        atomId: question.atomId,
        variantId: question.variantId,
        note,
        tempsMs: fige.current ?? 0,
        maitrise,
      });

      if (!resultat.ok) {
        setErreur(resultat.motif);
        setEnCours(false);
        return;
      }

      if (resultat.signal) eligibles.current = [...eligibles.current, question.atomId];

      setRevus((compte) => compte + 1);
      setEnCours(false);

      if (rang + 1 >= questions.length) {
        await terminer();
        return;
      }

      setChoisi(null);
      setRevelee(false);
      setRang(rang + 1);
    },
    [arreter, enCours, question, rang, questions.length, terminer],
  );

  if (termine || !question) {
    return <FinDeSession revus={revus} carte={carte} />;
  }

  const ferme = estFerme(question);

  return (
    <CarteQuestion
      rang={rang}
      total={questions.length}
      facet={question.facet}
      tags={question.tags}
      question={question.question}
      enCours={enCours}
      onMaitrise={() => void envoyer("EASY", true)}
    >
      {ferme && question.options && question.correctIndex !== null ? (
        <>
          <ReponseFermee
            options={question.options}
            correctIndex={question.correctIndex}
            choisi={choisi}
            onChoisir={(index) => {
              arreter();
              setChoisi(index);
            }}
          />
          {choisi !== null ? (
            <CorrectionFermee
              juste={choisi === question.correctIndex}
              answerKey={question.answerKey}
              enCours={enCours}
              dernier={rang + 1 >= questions.length}
              onSuite={(note) => void envoyer(note)}
            />
          ) : null}
        </>
      ) : (
        <ReponseOuverte
          answerKey={question.answerKey}
          revelee={revelee}
          enCours={enCours}
          onReveler={() => {
            arreter();
            setRevelee(true);
          }}
          onSeJuger={(note) => void envoyer(note)}
        />
      )}

      {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
      <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>
    </CarteQuestion>
  );
}
