"use client";

import { useState } from "react";
import { redecouperAction, supprimerDepotAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Ce qu'on peut faire d'un dépôt entier.
 *
 * Deux gestes, deux intentions. « Redécouper » garde le texte et retente
 * l'extraction : c'est la suite naturelle d'un dépôt qu'on a vidé parce que le
 * découpage ne convenait pas. « Supprimer » emporte tout, parce qu'on ne veut
 * plus de ça.
 *
 * La suppression demande confirmation sur place plutôt que dans une fenêtre :
 * elle est irréversible et emporte plus que ce qu'on voit — les questions
 * écrites et les passages faits partent avec. Ce que le second bouton annonce.
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
  const [confirme, setConfirme] = useState(false);
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
      <div className="gap-pas-2 flex flex-wrap">
        {redecoupable ? (
          <Button
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => void relancer()}
          >
            {enCours ? "Un instant" : "Redécouper"}
          </Button>
        ) : null}

        {confirme ? (
          <>
            <form action={supprimerDepotAction}>
              <input type="hidden" name="inputId" value={inputId} />
              <Button type="submit" variant="destructive">
                {concepts > 0
                  ? `Tout supprimer, ${concepts === 1 ? "le concept compris" : "les concepts compris"}`
                  : "Tout supprimer"}
              </Button>
            </form>
            <Button type="button" variant="ghost" onClick={() => setConfirme(false)}>
              Annuler
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirme(true)}>
            Supprimer ce dépôt
          </Button>
        )}
      </div>

      {redecoupable ? (
        <p className="mt-pas-3 text-petit max-w-lg text-stone-500">
          Redécouper relance une extraction sur le même texte, et prend une place de la journée
          comme un dépôt.
        </p>
      ) : null}

      {confirme ? (
        <p className="mt-pas-3 text-petit max-w-lg text-stone-500">
          Le texte, les concepts, leurs questions et leurs passages partent avec. Ça ne se défait
          pas.
        </p>
      ) : null}

      <p className="mt-pas-3 text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>
    </div>
  );
}
