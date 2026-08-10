"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reclamerMaitriseAction, repondreAction } from "@/app/(app)/reviser/actions";
import { CarteQuestion } from "@/components/revision/carte-question";
import { CorrectionFermee } from "@/components/revision/correction-fermee";
import { FinDeSession } from "@/components/revision/fin-de-session";
import { ReponseFermee } from "@/components/revision/reponse-fermee";
import { ReponseOuverte } from "@/components/revision/reponse-ouverte";
import { SortiDuCycle } from "@/components/revision/sorti-du-cycle";
import type { QuestionDeSession } from "@/lib/db/session-du-jour";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le déroulé d'une session.
 *
 * Le chronomètre part à l'affichage de la question et se fige à la validation —
 * le choix d'une option, ou la demande de l'étalon. Lire la correction n'entre
 * plus dans la mesure : c'est le signal le plus précieux de cette phase, et il
 * ne survit pas à une mesure polluée.
 *
 * Sur un format fermé, le clic sur une option **écrit le passage** : une seule
 * action dans le cas courant. Ce qui suit — lire la correction, enchaîner — ne
 * fait plus que naviguer.
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
  const [ecrit, setEcrit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [revus, setRevus] = useState(0);
  const [carte, setCarte] = useState<{ atomId: string; concept: string } | null>(null);
  const [sorti, setSorti] = useState<{ atomId: string; concept: string } | null>(null);

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

  const enregistrer = useCallback(
    async (note: ReviewRating, maitrise = false): Promise<boolean> => {
      if (!question || enCours) return false;

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

      setEnCours(false);

      if (!resultat.ok) {
        setErreur(resultat.motif);
        return false;
      }

      if (resultat.signal) eligibles.current = [...eligibles.current, question.atomId];

      setRevus((compte) => compte + 1);
      setEcrit(true);

      return true;
    },
    [arreter, enCours, question],
  );

  const avancer = useCallback(() => {
    if (rang + 1 >= questions.length) {
      void terminer();
      return;
    }

    setChoisi(null);
    setRevelee(false);
    setEcrit(false);
    setRang(rang + 1);
  }, [rang, questions.length, terminer]);

  if (termine || !question) {
    return <FinDeSession revus={revus} carte={carte} />;
  }

  const ferme = estFerme(question);

  async function suivreLaCorrection(note: ReviewRating) {
    // Le passage part au clic sur l'option ; s'il a échoué, on retente avant
    // d'avancer plutôt que de laisser filer une réponse donnée.
    if (ecrit || (await enregistrer(note))) avancer();
  }

  async function declarerMaitrise() {
    if (!question) return;

    const cible = { atomId: question.atomId, concept: question.concept };

    setSorti(null);

    if (await enregistrer("EASY", true)) {
      setSorti(cible);
      avancer();
    }
  }

  return (
    <>
      {sorti ? <SortiDuCycle concept={sorti} onAnnule={() => setSorti(null)} /> : null}

      <CarteQuestion
        rang={rang}
        total={questions.length}
        facet={question.facet}
        tags={question.tags}
        question={question.question}
        enCours={enCours}
        onMaitrise={() => void declarerMaitrise()}
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
                setSorti(null);
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
                onSuite={() =>
                  void suivreLaCorrection(choisi === question.correctIndex ? "GOOD" : "AGAIN")
                }
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
              setSorti(null);
            }}
            onSeJuger={(note) => void suivreLaCorrection(note)}
          />
        )}

        {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
        <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
          {erreur ? <span className="text-alerte">{erreur}</span> : null}
        </p>
      </CarteQuestion>
    </>
  );
}
