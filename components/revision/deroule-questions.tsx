"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CarteQuestion } from "@/components/revision/carte-question";
import { EnonceDeQuestion } from "@/components/revision/enonce-de-question";
import { JeterLaPierre } from "@/components/revision/jeter-la-pierre";
import { demandeUneProduction } from "@/lib/domain/geste-attendu";
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
 * Le déroulé d'une suite de questions, commun à la session et à
 * l'entraînement. La mécanique vit dans `useSuiteDeQuestions`, les formats dans
 * `ZoneDeReponse` et `EnonceDeQuestion`.
 */

export type { PassageDonne, Valider };

export function DerouleQuestions({
  questions,
  chiffree,
  onRepondre,
  onFini,
  onAvance,
  onSuspens,
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
  /**
   * Signale la réponse qui est sous les yeux sans être notée, et donne de quoi
   * l'écrire avant de partir ; `null` dès qu'il n'y a plus rien en suspens.
   * Seul le mode qui replanifie s'en sert.
   */
  onSuspens?: (abandonner: (() => Promise<void>) | null) => void;
  /** Ce que ce mode-là autorise sous la question. Rien, par défaut. */
  actions?: (contexte: {
    question: QuestionServie;
    enCours: boolean;
    valider: Valider;
  }) => ReactNode;
}) {
  const suite = useSuiteDeQuestions({ questions, onRepondre, onFini, onAvance });
  const question = suite.question;
  const enSuspens = suite.enSuspens;

  /*
    On ne signale que le basculement du drapeau, jamais la fermeture. Prendre
    `abandonner` en dépendance (identité neuve à chaque rendu) relancerait
    l'effet, qui remonte un état au parent, qui re-rend l'enfant : boucle infinie.
  */
  const dernierAbandon = useRef(suite.abandonner);

  useEffect(() => {
    dernierAbandon.current = suite.abandonner;
  });

  useEffect(() => {
    onSuspens?.(enSuspens ? () => dernierAbandon.current() : null);
  }, [enSuspens, onSuspens]);

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

          {/* Renoncer n'a de sens que là où il faut produire quelque chose ;
              sur une question ouverte, « Voir la réponse » est déjà la sortie. */}
          {suite.engage || !demandeUneProduction(question) ? null : (
            <JeterLaPierre enCours={suite.enCours} onJeter={suite.jeter} />
          )}
        </>
      )}

      {/* L'espace du message est réservé : une erreur ne décale pas la carte. */}
      <p className="mt-pas-4 text-petit min-h-5" role="status" aria-live="polite">
        {suite.erreur ? <span className="text-alerte">{suite.erreur}</span> : null}
      </p>
    </CarteQuestion>
  );
}
