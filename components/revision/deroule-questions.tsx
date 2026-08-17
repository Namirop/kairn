"use client";

import type { ReactNode } from "react";
import { CarteQuestion } from "@/components/revision/carte-question";
import { EnonceDeQuestion } from "@/components/revision/enonce-de-question";
import { JeterLaPierre } from "@/components/revision/jeter-la-pierre";
import { PierreJetee } from "@/components/revision/pierre-jetee";
import { reponseDeSecours } from "@/components/revision/reponse-de-secours";
import {
  useSuiteDeQuestions,
  type PassageDonne,
  type Valider,
} from "@/components/revision/use-suite-de-questions";
import { ZoneDeReponse } from "@/components/revision/zone-de-reponse";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Le déroulé d'une suite de questions, commun aux deux modes.
 *
 * Il pose une question et donne à voir ce qu'elle attend ; c'est
 * `useSuiteDeQuestions` qui tient le compte, le temps et les notes. Il ne sait
 * rien non plus des formats : `ZoneDeReponse` décide qu'un QCM se clique et
 * qu'un texte à trou se saisit, et `EnonceDeQuestion` décide de ce que la carte
 * met en titre.
 */

export type { PassageDonne, Valider };

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
  const suite = useSuiteDeQuestions({ questions, onRepondre, onFini, onAvance });
  const question = suite.question;

  if (!question) return null;

  return (
    <CarteQuestion
      rang={suite.rang}
      total={suite.total}
      chiffree={chiffree}
      tags={question.tags}
      enonce={<EnonceDeQuestion question={question} comble={suite.trou.comble} />}
      vuIlYaJours={question.vuIlYaJours}
      variantId={question.variantId}
      actions={actions?.({ question, enCours: suite.enCours, valider: suite.suivre })}
    >
      {suite.jetee ? (
        <PierreJetee
          {...reponseDeSecours(question)}
          enCours={suite.enCours}
          dernier={suite.dernier}
          onSuite={() => void suite.suivre("AGAIN")}
        />
      ) : (
        <>
          <ZoneDeReponse
            question={question}
            choisi={suite.choisi}
            revelee={suite.revelee}
            trou={suite.trou}
            enCours={suite.enCours}
            dernier={suite.dernier}
            onChoisir={suite.choisir}
            onReveler={suite.reveler}
            onVerifier={suite.verifier}
            onNoter={(note) => void suite.suivre(note)}
          />

          {suite.engage ? null : <JeterLaPierre enCours={suite.enCours} onJeter={suite.jeter} />}
        </>
      )}

      {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
      <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
        {suite.erreur ? <span className="text-alerte">{suite.erreur}</span> : null}
      </p>
    </CarteQuestion>
  );
}
