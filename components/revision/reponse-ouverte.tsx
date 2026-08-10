"use client";

import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Les formats où seule la personne peut juger : réponse courte, explication,
 * code.
 *
 * Elle formule sa réponse, demande l'étalon, puis se situe. Le chronomètre
 * s'arrête au moment où elle demande à voir — jamais après : le temps de lire
 * une réponse ne dit rien du rappel.
 *
 * L'étalon n'est pas une correction qui tombe. C'est un point de comparaison,
 * et c'est la personne qui compare.
 */

/**
 * Les quatre niveaux, dits du point de vue de celui qui se juge.
 *
 * Aucun n'est une note ni un compliment : « J'y étais » constate, « Sans
 * hésiter » constate aussi. La récompense est la progression, pas l'étiquette.
 */
const NIVEAUX: { note: ReviewRating; libelle: string }[] = [
  { note: "AGAIN", libelle: "Je ne l'avais pas" },
  { note: "HARD", libelle: "Approchant" },
  { note: "GOOD", libelle: "J'y étais" },
  { note: "EASY", libelle: "Sans hésiter" },
];

export function ReponseOuverte({
  answerKey,
  revelee,
  onReveler,
  onSeJuger,
  enCours,
}: {
  answerKey: string;
  revelee: boolean;
  onReveler: () => void;
  onSeJuger: (note: ReviewRating) => void;
  enCours: boolean;
}) {
  if (!revelee) {
    return (
      <div className="mt-pas-8">
        <Button type="button" onClick={onReveler} className="w-full sm:w-auto">
          Comparer à l&apos;étalon
        </Button>
        <p className="mt-pas-3 text-petit text-stone-500">
          Formule ta réponse d&apos;abord, même de tête. C&apos;est l&apos;effort de la retrouver
          qui la fixe.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-pas-8">
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
        L&apos;étalon
      </p>
      <p className="mt-pas-2 text-corps border-l-2 border-stone-300 pl-4 leading-relaxed text-stone-900">
        {answerKey}
      </p>

      <p className="mt-pas-8 text-petit text-stone-500">Où en étais-tu ?</p>
      <div className="gap-pas-2 mt-pas-3 grid grid-cols-2 sm:flex sm:flex-wrap">
        {NIVEAUX.map((niveau) => (
          <Button
            key={niveau.note}
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => onSeJuger(niveau.note)}
          >
            {niveau.libelle}
          </Button>
        ))}
      </div>
    </div>
  );
}
