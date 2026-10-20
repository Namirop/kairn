"use client";

import { useTranslations } from "next-intl";
import { BlocReponse } from "@/components/revision/bloc-reponse";
import { SuiteDeLaQuestion } from "@/components/revision/suite-de-la-question";
import { useDelaiDeLecture } from "@/components/revision/use-delai-de-lecture";
import { Button } from "@/components/ui/button";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Ce qui suit un renoncement : la réponse, et ce qui est noté. Le bouton
 * attend le temps de lire, comme après une réponse fausse.
 */
export function PierreJetee({
  reponse,
  precision,
  enCours,
  dernier,
  onSuite,
}: {
  reponse: string;
  /** Ce que l'étalon ajoute à la réponse, s'il ajoute quelque chose. */
  precision?: string;
  enCours: boolean;
  dernier: boolean;
  onSuite: () => void;
}) {
  const lu = useDelaiDeLecture(true);
  const t = useTranslations("revision.question");

  return (
    <SuiteDeLaQuestion>
      <BlocReponse>
        <TexteTechnique>{etalonLisible(reponse)}</TexteTechnique>

        {precision ? (
          <span className="mt-pas-3 text-petit block text-stone-300">
            <TexteTechnique>{etalonLisible(precision)}</TexteTechnique>
          </span>
        ) : null}
      </BlocReponse>

      {/* Ce qui est noté, pas ce que ça déclenche : en entraînement, rien ne
          se replanifie. */}
      <p className="mt-pas-6 text-petit text-stone-500">{t("nonRetrouve")}</p>

      <div className="gap-pas-4 mt-pas-3 flex flex-wrap items-center">
        <Button type="button" disabled={enCours || !lu} onClick={onSuite}>
          {dernier ? t("terminer") : t("continuer")}
        </Button>

        <p className="text-petit min-h-5 text-stone-500" aria-hidden>
          {lu ? "" : t("tempsDeLire")}
        </p>
      </div>
    </SuiteDeLaQuestion>
  );
}
