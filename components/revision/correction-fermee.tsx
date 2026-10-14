"use client";

import { useTranslations } from "next-intl";
import { BlocReponse } from "@/components/revision/bloc-reponse";
import { SuiteDeLaQuestion } from "@/components/revision/suite-de-la-question";
import { etalonUtile } from "@/lib/domain/etalon-utile";
import { useDelaiDeLecture } from "@/components/revision/use-delai-de-lecture";
import { Button } from "@/components/ui/button";
import { etalonLisible } from "@/lib/domain/etalon-lisible";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Ce qui suit une réponse à choix.
 *
 * Le passage est déjà écrit au clic sur l'option : ce bouton ne note rien, il
 * enchaîne.
 *
 * Le verdict n'est écrit que pour les lecteurs d'écran : à l'écran, les options
 * le portent déjà.
 *
 * Faux, le bouton attend le temps de lire le pourquoi, et dit qu'il attend : un
 * bouton inerte sans raison se clique plusieurs fois avant qu'on comprenne.
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
  const lu = useDelaiDeLecture(!juste);
  const t = useTranslations("revision.question");

  return (
    <SuiteDeLaQuestion>
      <p className="sr-only" role="status">
        {juste ? t("verdict.juste") : t("verdict.faux")}
      </p>

      {!juste && complete ? (
        <div className="mb-pas-8">
          <BlocReponse intitule={t("pourquoi")}>
            <TexteTechnique>{etalonLisible(answerKey)}</TexteTechnique>
          </BlocReponse>
        </div>
      ) : null}

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="button" disabled={enCours || !lu} onClick={onSuite}>
          {dernier ? t("terminer") : t("continuer")}
        </Button>

        {/* La place est tenue : la ligne s'efface sans faire remonter la carte. */}
        <p className="text-petit min-h-5 text-stone-500" aria-hidden>
          {lu ? "" : t("tempsDeLire")}
        </p>
      </div>
    </SuiteDeLaQuestion>
  );
}
