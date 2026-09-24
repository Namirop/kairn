"use client";

import { useActionState, useState } from "react";
import { supprimerMonCompteAction, type EtatSuppression } from "@/app/(app)/reglages/actions";
import { Button } from "@/components/ui/button";
import { MOT_DE_CONFIRMATION } from "@/lib/domain/confirmation-de-suppression";

/**
 * Emporter ses données, ou les effacer.
 *
 * Deux droits, et ils ne se présentent pas pareil. L'export est un geste banal :
 * un lien, on clique, le fichier arrive. La suppression est irréversible, donc
 * elle demande de recopier un mot — pas de cocher une case, qui se coche sans
 * lire.
 *
 * Le formulaire de suppression ne s'ouvre qu'au clic. Laissé déplié dans les
 * réglages, il ferait du bouton rouge un élément de décor qu'on finit par frôler.
 */
export function MesDonnees() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatSuppression, FormData>(
    supprimerMonCompteAction,
    {},
  );

  return (
    <section className="mt-pas-12">
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        Tes données
      </h2>

      <p className="mt-pas-4 text-petit max-w-prose text-stone-500">
        Tu peux emporter ce que tu as déposé à tout moment : un fichier avec tes dépôts, les
        concepts qui en ont été tirés, leurs questions et tes passages.
      </p>

      <div className="mt-pas-4">
        {/* Un lien et non un bouton : c'est une navigation vers un fichier, et
            le navigateur sait déjà quoi en faire. */}
        <a
          href="/api/mon-compte/export"
          download
          className="rounded-galet text-petit text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          Télécharger mes données
        </a>
      </div>

      <div className="mt-pas-8 pt-pas-6 border-t border-stone-300">
        {ouvert ? (
          <form action={action} noValidate className="max-w-prose">
            <p className="text-petit text-stone-500">
              Ça efface le compte, tes dépôts, tes concepts, leurs questions et tous tes passages.
              C&apos;est immédiat et il n&apos;y a pas de retour en arrière. Pense à télécharger tes
              données avant.
            </p>

            <label htmlFor="confirmation" className="mt-pas-4 text-petit block text-stone-500">
              Recopie « {MOT_DE_CONFIRMATION} » pour confirmer
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
                {enCours ? "Suppression…" : "Supprimer définitivement"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
          >
            Supprimer mon compte
          </button>
        )}
      </div>
    </section>
  );
}
