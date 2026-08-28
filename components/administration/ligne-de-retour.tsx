"use client";

import { useActionState } from "react";
import {
  basculerLeTraitementAction,
  type EtatDuTraitement,
} from "@/app/(app)/admin/retours/actions";
import { Button } from "@/components/ui/button";
import type { RetourLu } from "@/lib/db/retour";
import type { SujetDeRetour } from "@/lib/db/types";

/**
 * Un retour, tel qu'on le relit.
 *
 * Le message porte le poids, tout le reste est en retrait — c'est la seule
 * chose qu'une personne a pris la peine d'écrire. Le contexte technique tient
 * sur une ligne en prose : quatre valeurs courtes qu'on parcourt, pas quatre
 * lignes qu'on compare.
 *
 * **La capture ne s'affiche que si on la demande.** Une page de cinq retours
 * chargerait cinq images de plusieurs centaines de kilo-octets pour n'en montrer
 * aucune ; `<details>` ne demande la sienne qu'à l'ouverture, sans une ligne de
 * JavaScript.
 *
 * L'état « traité » est un aller-retour et non un aller : se tromper de bouton
 * ne doit pas sortir un retour de la pile pour de bon.
 */

const SUJETS: Record<SujetDeRetour, string> = {
  BUG: "Ça ne marche pas",
  COMPORTEMENT: "Ça surprend",
  TEXTE: "Un mot de travers",
  AUTRE: "Autre",
};

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
          {SUJETS[retour.sujet]}
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

          {/* Sans dimensions connues : l'image vient d'un téléphone, d'un écran
              large ou d'un recadrage, et lui en imposer les déformerait toutes
              sauf une. */}
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
