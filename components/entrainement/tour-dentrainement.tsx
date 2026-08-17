"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import {
  principeVuAction,
  sentrainerAction,
  tourSuivantAction,
} from "@/app/(app)/entrainement/actions";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { EtatDentrainement } from "@/components/entrainement/etat-dentrainement";
import { PrincipeDeLentrainement } from "@/components/entrainement/principe-de-lentrainement";
import { DerouleQuestions, type PassageDonne } from "@/components/revision/deroule-questions";
import { EnTeteDeScene } from "@/components/revision/en-tete-de-scene";
import { SceneDeSession } from "@/components/revision/scene-de-session";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Un tour d'entraînement, puis le suivant si on en redemande.
 *
 * Aucun compte de fin, aucun score : ce qu'on fait ici ne se cumule nulle part.
 * L'écran dit simplement que le tour est fini et laisse le choix de continuer.
 */

/**
 * Ce qui encadre les écrans hors tour : le principe, et la fin.
 *
 * Un panneau ordinaire, comme le reste de l'application. La scène à deux
 * colonnes n'a de sens que tant qu'il y a un chemin à montrer.
 */
function Cadre({ children }: { children: ReactNode }) {
  return (
    <PileDePanneaux>
      <Panneau surface="papier" mesure="texte" remplit className="md:py-pas-16">
        <div className="flex w-full flex-col">{children}</div>
      </Panneau>
    </PileDePanneaux>
  );
}
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
  const [faites, setFaites] = useState(0);
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
    setFaites(0);
    setCharge(false);
  }, []);

  if (!explique) {
    return (
      <Cadre>
        <PrincipeDeLentrainement
          onCommencer={() => {
            setExplique(true);
            void principeVuAction();
          }}
        />
      </Cadre>
    );
  }

  if (tourFini || questions.length === 0) {
    return (
      <Cadre>
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
      </Cadre>
    );
  }

  return (
    <SceneDeSession
      enTete={<EnTeteDeScene />}
      // Sans compte à l'écran : un tour n'a pas de longueur à tenir. Le rail dit
      // le cadre — la pile pour l'avancée, une ligne pour rappeler qu'ici rien ne
      // se replanifie. Cette ligne flottait sous la carte, sans propriétaire.
      rail={<EtatDentrainement faites={faites} total={questions.length} />}
    >
      <DerouleQuestions
        key={questions.map((question) => question.variantId).join()}
        questions={questions}
        chiffree={false}
        onRepondre={repondre}
        onFini={() => setTourFini(true)}
        onAvance={setFaites}
      />
    </SceneDeSession>
  );
}
