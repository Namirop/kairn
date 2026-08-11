"use client";

import { etalonUtile } from "@/components/revision/etalon-utile";
import { Button } from "@/components/ui/button";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Ce qui suit une réponse à choix.
 *
 * Le passage est déjà écrit — il l'a été au clic sur l'option, en une seule
 * action. Ce bouton ne note plus rien, il enchaîne.
 *
 * Une bonne réponse n'est pas félicitée : l'écran dit ce qui est, et la
 * récompense est l'espacement qui s'allonge. Une mauvaise réponse donne
 * l'étalon — sans lui, l'échec n'apprend rien.
 */
export function CorrectionFermee({
  juste,
  answerKey,
  bonneOption,
  enCours,
  dernier,
  onSuite,
}: {
  juste: boolean;
  answerKey: string;
  bonneOption: string;
  enCours: boolean;
  dernier: boolean;
  onSuite: () => void;
}) {
  const complete = etalonUtile(answerKey, bonneOption);

  return (
    <div className="mt-pas-8 pt-pas-6">
      <p className="text-mono font-mono tracking-[0.12em] uppercase">
        {juste ? (
          <span className="text-lichen-deep">Réponse juste</span>
        ) : (
          <span className="text-alerte">Réponse fausse</span>
        )}
      </p>

      {!juste && complete ? (
        <p className="mt-pas-3 text-corps border-l-2 border-stone-300 pl-4 leading-relaxed whitespace-pre-wrap text-stone-900">
          <TexteTechnique>{answerKey}</TexteTechnique>
        </p>
      ) : null}

      <div className="gap-pas-2 mt-pas-6 flex flex-wrap">
        <Button type="button" disabled={enCours} onClick={onSuite}>
          {dernier ? "Terminer" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
