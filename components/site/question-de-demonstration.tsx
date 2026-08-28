"use client";

import { useState } from "react";
import { LIBELLE_FORMAT } from "@/components/depots/libelle-format";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { QuestionDeDemonstration as Question } from "@/lib/domain/questions-de-demonstration";

/**
 * Une vraie question, posée pendant que le découpage tourne.
 *
 * Dix à quinze secondes d'attente sur la seule page qui convertit, et rien à
 * faire pendant. Un gabarit qui bat dit « ça charge » et rien de plus ; il ne
 * donne aucune raison de rester, et c'est là qu'un onglet se ferme.
 *
 * Ce qu'on met à la place est **le produit lui-même**, pas une distraction : on
 * répond à une question de Kairn, en un clic, avant même d'avoir vu son propre
 * découpage. Le mécanisme se comprend en le faisant, ce qu'aucune phrase de
 * landing n'obtient. L'attente cesse d'être un temps mort pour devenir le seul
 * moment de la visite où on manipule le produit.
 *
 * **Elle ne se met jamais en travers du résultat.** Elle n'apparaît qu'après
 * quelques secondes — la plupart des découpages passent avant —, elle vit sous
 * l'attente et non à sa place, et le résultat la remplace dès qu'il arrive :
 * c'est ce qu'on est venu chercher, une question d'exemple ne le retarde pas.
 *
 * **On ne félicite pas.** La bonne réponse se désigne, la précision explique, et
 * c'est tout : la récompense du produit est la progression, jamais un
 * compliment. Une réponse fausse ne se peint pas en rouge non plus — rien n'est
 * cassé, on n'a rien à réparer, et l'alerte est réservée à ce qui l'est.
 */

export function QuestionDeDemonstration({ question }: { question: Question }) {
  const [choisi, setChoisi] = useState<number | null>(null);
  const repondu = choisi !== null;

  return (
    <section className="gap-pas-3 flex max-w-xl flex-col">
      <h3 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        En attendant · {LIBELLE_FORMAT[question.format]}
      </h3>

      <p className="font-display text-h2-app leading-tight font-semibold text-stone-900">
        <TexteTechnique>{question.enonce}</TexteTechnique>
      </p>

      <div role="group" aria-label={question.enonce} className="gap-pas-2 flex flex-col">
        {question.reponses.map((reponse, rang) => (
          <Proposition
            key={reponse}
            reponse={reponse}
            bonne={rang === question.bonne}
            repondu={repondu}
            onChoisir={() => setChoisi(rang)}
          />
        ))}
      </div>

      {/* La place n'est pas réservée : la précision arrive sous les propositions,
          en bas d'un bloc qui n'a rien en dessous de lui, donc elle ne pousse
          rien. Réserver deux lignes de vide en attendant un clic qui n'aura
          peut-être jamais lieu creuserait l'attente au lieu de la remplir. */}
      {repondu ? (
        <p className="text-petit text-stone-500" role="status">
          <TexteTechnique>{question.precision}</TexteTechnique>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Une proposition, avant et après le clic.
 *
 * Après, tout se fige et la bonne réponse est la seule qui garde l'encre : les
 * autres passent en gris, y compris celle qu'on venait de choisir si elle était
 * fausse. Pas de croix, pas de rouge — on regarde la bonne, on lit pourquoi.
 */
function Proposition({
  reponse,
  bonne,
  repondu,
  onChoisir,
}: {
  reponse: string;
  bonne: boolean;
  repondu: boolean;
  onChoisir: () => void;
}) {
  const retenue = repondu && bonne;

  return (
    <button
      type="button"
      disabled={repondu}
      onClick={onChoisir}
      aria-label={retenue ? `${reponse} — la réponse` : reponse}
      className={`rounded-carte px-pas-4 py-pas-3 text-corps gap-pas-4 flex items-baseline justify-between text-left transition-colors disabled:pointer-events-none ${
        retenue
          ? "bg-surface-ombre font-medium text-stone-900"
          : repondu
            ? "text-stone-500"
            : "bg-surface-ombre/70 hover:bg-surface-ombre text-stone-900"
      }`}
    >
      <span>{reponse}</span>

      {retenue ? (
        <span
          aria-hidden
          className="text-mono shrink-0 font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          La réponse
        </span>
      ) : null}
    </button>
  );
}
