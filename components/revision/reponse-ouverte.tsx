"use client";

import { useTranslations } from "next-intl";
import { BarreDeNotation } from "@/components/revision/barre-de-notation";
import { BlocReponse } from "@/components/revision/bloc-reponse";
import { SuiteDeLaQuestion } from "@/components/revision/suite-de-la-question";
import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Les formats où seule la personne peut juger, sur l'étalon. Le chronomètre
 * s'arrête quand elle demande à voir : le temps de lecture ne dit rien du rappel.
 */
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
  const t = useTranslations("revision.question.ouverte");

  if (!revelee) {
    return (
      <div className="mt-pas-scene">
        <p className="text-corps text-stone-900">{t("consigne")}</p>

        <div className="gap-pas-4 mt-pas-3 flex flex-col sm:flex-row sm:items-center">
          <Button type="button" onClick={onReveler} className="w-full shrink-0 sm:w-auto">
            {t("voir")}
          </Button>

          <p className="text-petit text-stone-500">{t("raison")}</p>
        </div>
      </div>
    );
  }

  return (
    <SuiteDeLaQuestion>
      <BlocReponse>
        <TexteTechnique>{etalonLisible(answerKey)}</TexteTechnique>
      </BlocReponse>

      {/* Se juger est un autre geste que lire : l'écart le dit. */}
      <div className="mt-pas-scene">
        <BarreDeNotation enCours={enCours} onNoter={onSeJuger} />
      </div>
    </SuiteDeLaQuestion>
  );
}
