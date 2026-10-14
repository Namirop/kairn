"use client";

import { CarteQuestion } from "@/components/revision/carte-question";
import { EnonceDeQuestion } from "@/components/revision/enonce-de-question";
import type { TexteATrou } from "@/components/revision/use-suite-de-questions";
import { ZoneDeReponse } from "@/components/revision/zone-de-reponse";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Une question réelle montée dans un état de réponse figé. Même composition
 * que `DerouleQuestions` ; seul l'état « répondu » est posé en accessoire au
 * lieu de sortir de la machine à états.
 */

export type EtatDApercu = "juste" | "faux" | "revele";

export function ApercuQuestion({
  question,
  etat,
}: {
  question: QuestionServie;
  etat: EtatDApercu;
}) {
  const ferme = question.options !== null && question.correctIndex !== null;
  const choisi = ferme ? (etat === "juste" ? question.correctIndex : mauvaisIndex(question)) : null;
  // Les formats ouverts (réponse courte, explication, code) se montrent révélés.
  const revelee = !ferme && question.cloze === null;
  const trou = trouFige(question, etat);
  const rien = () => {};

  return (
    <CarteQuestion
      rang={0}
      total={1}
      tags={question.tags}
      enonce={<EnonceDeQuestion question={question} comble={trou.comble} />}
      vuIlYaJours={question.vuIlYaJours}
      variantId={question.variantId}
    >
      <ZoneDeReponse
        question={question}
        choisi={choisi}
        revelee={revelee}
        trou={trou}
        enCours={false}
        dernier
        onChoisir={rien}
        onReveler={rien}
        onVerifier={rien}
        onNoter={rien}
      />
    </CarteQuestion>
  );
}

/** Le premier index qui n'est pas la bonne réponse — l'option cliquée à tort. */
function mauvaisIndex(question: QuestionServie): number {
  const bon = question.correctIndex ?? 0;
  const total = question.options?.length ?? 0;

  for (let i = 0; i < total; i += 1) {
    if (i !== bon) return i;
  }

  return 0;
}

/**
 * L'état d'un texte à trou, figé. Requis même hors CLOZE, où `ZoneDeReponse`
 * ne le lit pas. Sur un CLOZE, `comble` fait apparaître le terme attendu comme
 * après une vérification.
 */
function trouFige(question: QuestionServie, etat: EtatDApercu): TexteATrou {
  const attendu = question.cloze?.accepted[0] ?? "";
  const verdict =
    question.cloze === null ? null : etat === "faux" ? "RATE" : etat === "juste" ? "JUSTE" : null;
  // À côté, on montre ce qui a été écrit : un leurre généré fait une saisie
  // plausible. Sinon rien n'est saisi.
  const saisie = verdict === "RATE" ? (question.cloze?.leurres[0] ?? "…") : "";

  return {
    saisie,
    saisir: () => {},
    verdict,
    attendu,
    comble: verdict !== null ? attendu : saisie.trim() || null,
    pistes: [],
    aide: false,
    demanderDeLaide: () => {},
    juger: () => {},
  };
}
