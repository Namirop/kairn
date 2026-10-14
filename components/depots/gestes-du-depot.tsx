"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { redecouperAction, supprimerDepotAction } from "@/app/(app)/depots/actions";
import { SuppressionEnDeuxTemps } from "@/components/depots/suppression-en-deux-temps";
import { Button } from "@/components/ui/button";

/**
 * Ce qu'on peut faire d'un dépôt entier : « Redécouper » garde le texte et
 * retente l'extraction ; « Supprimer » emporte tout.
 *
 * La suppression demande confirmation sur place : elle est irréversible et
 * emporte aussi les questions et les passages faits, ce que le second bouton
 * annonce.
 */
export function GestesDuDepot({
  inputId,
  redecoupable,
  concepts,
}: {
  inputId: string;
  redecoupable: boolean;
  concepts: number;
}) {
  const t = useTranslations("depots.depot.gestes");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function relancer() {
    setEnCours(true);
    setErreur(null);

    const resultat = await redecouperAction(inputId);

    setEnCours(false);
    if (!resultat.ok) setErreur(resultat.motif);
  }

  return (
    <div className="mt-pas-8">
      <SuppressionEnDeuxTemps
        action={supprimerDepotAction}
        champs={{ inputId }}
        declencheur={t("supprimer")}
        confirmation={t("toutSupprimer", { concepts })}
        consequence={t("consequence")}
        avant={
          redecoupable ? (
            <Button
              type="button"
              variant="outline"
              disabled={enCours}
              onClick={() => void relancer()}
            >
              {enCours ? t("unInstant") : t("redecouper")}
            </Button>
          ) : null
        }
      />

      {redecoupable ? (
        /* Pleine largeur, sans `max-w-prose`, comme la conséquence de la
           suppression juste au-dessus. */
        <p className="mt-pas-3 text-petit text-stone-500">{t("explication")}</p>
      ) : null}

      <p className="mt-pas-3 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>
    </div>
  );
}
