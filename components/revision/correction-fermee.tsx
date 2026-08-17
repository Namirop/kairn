"use client";

import { BlocReponse } from "@/components/revision/bloc-reponse";
import { etalonUtile } from "@/components/revision/etalon-utile";
import { Button } from "@/components/ui/button";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Ce qui suit une réponse à choix.
 *
 * Le passage est déjà écrit — il l'a été au clic sur l'option, en une seule
 * action. Ce bouton ne note plus rien, il enchaîne.
 *
 * Une bonne réponse n'est pas félicitée : l'écran dit ce qui est, et la
 * récompense est l'espacement qui s'allonge. Une mauvaise réponse donne la
 * réponse attendue — sans elle, l'échec n'apprend rien.
 *
 * Le verdict n'est pas écrit. Les options le portent déjà : la bonne est
 * surlignée, la sienne marquée quand elle est fausse. Le redire en toutes lettres
 * juste au-dessus du bouton faisait une ligne qui n'ajoutait rien à qui voit
 * l'écran. Elle reste, muette, pour qui l'entend.
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
    <div className="mt-pas-8">
      <p className="sr-only" role="status">
        {juste ? "Réponse juste." : "Réponse fausse."}
      </p>

      {!juste && complete ? (
        <div className="mb-pas-8">
          <BlocReponse intitule="Pourquoi">
            <TexteTechnique>{etalonLisible(answerKey)}</TexteTechnique>
          </BlocReponse>
        </div>
      ) : null}

      <div className="gap-pas-2 flex flex-wrap">
        <Button type="button" disabled={enCours} onClick={onSuite}>
          {dernier ? "Terminer" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
