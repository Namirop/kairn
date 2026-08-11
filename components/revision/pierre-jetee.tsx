"use client";

import { Button } from "@/components/ui/button";

/**
 * Ce qui suit une pierre jetée.
 *
 * On a renoncé : il n'y a plus rien à juger, et l'écran ne demande plus rien.
 * Il donne la réponse — sans elle, renoncer n'apprendrait rien et le geste ne
 * serait qu'une porte de sortie.
 *
 * Il dit aussi ce que ça coûte. Un geste qui compte comme un échec et ne le dit
 * pas se découvre à la mauvaise échéance, des jours plus tard.
 */
export function PierreJetee({
  reponse,
  precision,
  enCours,
  dernier,
  onSuite,
}: {
  reponse: string;
  /** Ce que l'étalon ajoute à la réponse, quand il ajoute quelque chose. */
  precision?: string;
  enCours: boolean;
  dernier: boolean;
  onSuite: () => void;
}) {
  return (
    <div className="mt-pas-8">
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">La réponse</p>

      <p className="mt-pas-3 text-corps border-l-2 border-stone-300 pl-4 leading-relaxed text-stone-900">
        {reponse}
      </p>

      {precision ? (
        <p className="mt-pas-3 text-petit max-w-lg leading-relaxed text-stone-500">{precision}</p>
      ) : null}

      {/* Ce qui est écrit, pas ce que ça déclenche : en entraînement rien ne se
          replanifie, et « compte » aurait dit le contraire de la ligne qui vit
          sous la carte. */}
      <p className="mt-pas-6 text-petit text-stone-500">Noté comme non retrouvé.</p>

      <div className="mt-pas-3">
        <Button type="button" disabled={enCours} onClick={onSuite}>
          {dernier ? "Terminer" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
