"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  principeVuAction,
  sentrainerAction,
  tourSuivantAction,
} from "@/app/(app)/entrainement/actions";
import { PrincipeDeLentrainement } from "@/components/entrainement/principe-de-lentrainement";
import { DerouleQuestions, type PassageDonne } from "@/components/revision/deroule-questions";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Un tour d'entraînement, puis le suivant si on en redemande.
 *
 * Aucun compte de fin, aucun score : ce qu'on fait ici ne se cumule nulle part.
 * L'écran dit simplement que le tour est fini et laisse le choix de continuer.
 */
export function TourDentrainement({
  premierTour,
  principeVu,
}: {
  premierTour: QuestionServie[];
  principeVu: boolean;
}) {
  const [explique, setExplique] = useState(principeVu);
  const [questions, setQuestions] = useState(premierTour);
  const [tourFini, setTourFini] = useState(false);
  const [charge, setCharge] = useState(false);

  const repondre = useCallback(
    (passage: PassageDonne) =>
      sentrainerAction({
        atomId: passage.question.atomId,
        variantId: passage.question.variantId,
        note: passage.note,
        tempsMs: passage.tempsMs,
      }),
    [],
  );

  const encore = useCallback(async () => {
    setCharge(true);

    const suivant = await tourSuivantAction();

    setQuestions(suivant);
    setTourFini(false);
    setCharge(false);
  }, []);

  if (!explique) {
    return (
      <PrincipeDeLentrainement
        onCommencer={() => {
          setExplique(true);
          void principeVuAction();
        }}
      />
    );
  }

  if (tourFini || questions.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col">
        <h1 className="text-h1-app leading-tight font-bold text-stone-900">
          {questions.length === 0 ? "Rien à travailler pour l'instant" : "Tour terminé"}
        </h1>
        <p className="mt-pas-3 text-corps max-w-lg leading-relaxed text-stone-500">
          {questions.length === 0
            ? "L'entraînement pioche dans les questions de tes concepts. Dépose quelque chose, et il aura de quoi te reposer."
            : "Ton planning n'a pas bougé. Tu peux enchaîner, ou revenir plus tard."}
        </p>

        <div className="gap-pas-3 mt-pas-8 flex flex-col sm:flex-row">
          {questions.length > 0 ? (
            <Button type="button" disabled={charge} onClick={() => void encore()}>
              {charge ? "Un instant" : "Encore un tour"}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${ROUTES.depots}/nouveau`}>Déposer</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={ROUTES.aujourdhui}>Retour à aujourd&apos;hui</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col">
      <DerouleQuestions
        key={questions.map((question) => question.variantId).join()}
        questions={questions}
        onRepondre={repondre}
        onFini={() => setTourFini(true)}
      />

      {/* La ligne permanente, discrète : le principe se rappelle sans barrer la
          route. Elle vit sous la carte, hors du chemin de la réponse. */}
      <p className="mt-pas-8 text-petit mx-auto w-full max-w-2xl text-stone-500">
        Entraînement — ça ne change pas ton planning.
      </p>
    </div>
  );
}
