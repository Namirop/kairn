"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { supprimerMonCompteAction, type EtatSuppression } from "@/app/(app)/reglages/actions";
import { Button } from "@/components/ui/button";
import { MOT_DE_CONFIRMATION } from "@/lib/domain/confirmation-de-suppression";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Emporter ses données, ou les effacer. La suppression, irréversible, demande
 * de recopier un mot (une case se coche sans lire), et son formulaire ne se
 * déplie qu'au clic.
 */
export function MesDonnees() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatSuppression, FormData>(
    supprimerMonCompteAction,
    {},
  );
  const t = useTranslations("compte.donnees");
  const mot = MOT_DE_CONFIRMATION[useLangue()];

  return (
    <section className="mt-pas-12">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {t("titre")}
      </h2>

      <p className="mt-pas-4 text-petit max-w-prose text-stone-500">{t("texte")}</p>

      <div className="mt-pas-4">
        <a
          href="/api/mon-compte/export"
          download
          className="rounded-galet text-petit text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          {t("telecharger")}
        </a>
      </div>

      <div className="mt-pas-8 pt-pas-6 border-t border-stone-300">
        {ouvert ? (
          <form action={action} noValidate className="max-w-prose">
            <p className="text-petit text-stone-500">{t("avertissement")}</p>

            <label htmlFor="confirmation" className="mt-pas-4 text-petit block text-stone-500">
              {t("recopie", { mot })}
            </label>
            <input
              id="confirmation"
              name="confirmation"
              autoComplete="off"
              // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
              className="rounded-galet mt-pas-2 px-pas-3 py-pas-2 md:text-petit focus-visible:border-alerte w-full max-w-64 border border-stone-300 bg-transparent text-base text-stone-900 outline-none"
            />

            {/* L'espace du message est réservé : l'erreur ne décale pas les boutons. */}
            <p className="mt-pas-2 text-petit min-h-5" role="status" aria-live="polite">
              {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
            </p>

            <div className="gap-pas-3 mt-pas-4 flex flex-wrap">
              <Button type="submit" variant="destructive" size="sm" disabled={enCours}>
                {enCours ? t("suppression") : t("supprimer")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)}>
                {t("annuler")}
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
          >
            {t("ouvrir")}
          </button>
        )}
      </div>
    </section>
  );
}
