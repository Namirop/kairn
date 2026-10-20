"use client";
// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.

import { useActionState } from "react";
import {
  basculerLeTraitementAction,
  type EtatDuTraitement,
} from "@/app/(app)/admin/retours/actions";
import { Button } from "@/components/ui/button";
import type { RetourLu } from "@/lib/db/retour";
import { LIBELLE_DE_SUJET } from "@/lib/retours/libelle-du-sujet";

/**
 * `<details>` : l'image ne charge qu'à l'ouverture, sans JavaScript. « Traité »
 * se bascule dans les deux sens : un mauvais clic ne sort rien de la pile.
 */

const JOUR = new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" });

export function LigneDeRetour({ retour }: { retour: RetourLu }) {
  const [etat, basculer, enCours] = useActionState<EtatDuTraitement, FormData>(
    basculerLeTraitementAction,
    {},
  );

  const traite = retour.traiteLe !== null;

  return (
    <li className={`py-pas-6 ${traite ? "opacity-60" : ""}`}>
      <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-900 uppercase">
          {LIBELLE_DE_SUJET[retour.sujet]}
          {retour.ecran ? <span className="text-stone-500"> · {retour.ecran}</span> : null}
        </p>
        <p className="text-mono font-mono text-stone-500 tabular-nums">
          {JOUR.format(retour.createdAt)}
        </p>
      </div>

      <p className="mt-pas-3 text-corps max-w-prose leading-relaxed whitespace-pre-wrap text-stone-900">
        {retour.message}
      </p>

      <p className="mt-pas-3 text-petit max-w-prose text-stone-500">
        {[retour.auteur ?? "compte supprimé", retour.contexte].filter(Boolean).join(" · ")}
      </p>

      {retour.aUneCapture ? (
        <details className="mt-pas-3">
          <summary className="text-petit cursor-pointer text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline">
            Voir la capture
          </summary>

          {/* Sans dimensions : téléphone ou écran large, les fixer déformerait. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/retours/${retour.id}/capture`}
            alt={`Capture jointe au retour du ${JOUR.format(retour.createdAt)}`}
            className="rounded-carte mt-pas-3 max-w-full border border-stone-300"
          />
        </details>
      ) : null}

      <form action={basculer} className="gap-pas-4 mt-pas-4 flex flex-wrap items-center">
        <input type="hidden" name="id" value={retour.id} />

        <Button type="submit" variant={traite ? "ghost" : "outline"} size="sm" disabled={enCours}>
          {traite ? "Remettre à lire" : "Marquer traité"}
        </Button>

        {etat.erreur ? <span className="text-petit text-alerte">{etat.erreur}</span> : null}
      </form>
    </li>
  );
}
