"use client";

import { useTranslations } from "next-intl";
import { BlocReponse } from "@/components/revision/bloc-reponse";
import { SuiteDeLaQuestion } from "@/components/revision/suite-de-la-question";
import { useDelaiDeLecture } from "@/components/revision/use-delai-de-lecture";
import { Button } from "@/components/ui/button";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Ce qui suit une pierre jetée.
 *
 * On a renoncé : il n'y a plus rien à juger, et l'écran ne demande plus rien.
 * Il donne la réponse — sans elle, renoncer n'apprendrait rien et le geste ne
 * serait qu'une porte de sortie.
 *
 * Il dit aussi ce que ça coûte. Un geste qui compte comme un échec et ne le dit
 * pas se découvre à la mauvaise échéance, des jours plus tard.
 *
 * Le bouton attend le temps de lire, comme après une réponse fausse : la réponse
 * affichée ici est toute la contrepartie du renoncement, et on vient de la
 * demander expressément.
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

      {/* Ce qui est écrit, pas ce que ça déclenche : en entraînement rien ne se
          replanifie, et « compte » aurait dit le contraire de la ligne qui vit
          sous la carte. */}
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
