"use client";

import { useState } from "react";
import {
  confirmerConceptAction,
  desarchiverConceptAction,
  modifierConceptAction,
  supprimerConceptAction,
} from "@/app/(app)/depots/actions";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConceptLu } from "@/lib/db/depot-detaille";

/**
 * Un concept, son état, et ce qu'on peut en faire.
 *
 * Ses questions ne sont pas affichées : les lire hors session revient à se
 * gâcher la surprise, et une question qu'on a lue la veille ne mesure plus
 * rien. Seul leur nombre apparaît — c'est ce qui dit que le travail est fait.
 *
 * Un concept douteux dit pourquoi il est signalé sans donner la version
 * « juste » : on ne l'a pas vérifiée, et affirmer serait pire que douter.
 */

function Questions({ nombre }: { nombre: number }) {
  if (nombre === 0) return null;

  return (
    <p className="mt-pas-3 text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
      {nombre} {nombre === 1 ? "question écrite" : "questions écrites"}
    </p>
  );
}

export function ConceptCorrigeable({ concept, inputId }: { concept: ConceptLu; inputId: string }) {
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(concept.concept);

  return (
    <li className="p-pas-6 rounded-carte bg-surface-papier">
      {edition ? (
        <form action={modifierConceptAction} className="gap-pas-3 flex flex-col">
          <input type="hidden" name="atomId" value={concept.id} />
          <input type="hidden" name="inputId" value={inputId} />
          <label htmlFor={`concept-${concept.id}`} className="sr-only">
            Réécrire le concept
          </label>
          <textarea
            id={`concept-${concept.id}`}
            name="concept"
            rows={4}
            value={texte}
            onChange={(evenement) => setTexte(evenement.target.value)}
            className="p-pas-3 text-petit rounded-champ bg-surface-ombre w-full resize-y border border-stone-300 leading-relaxed"
          />
          <p className="text-petit text-stone-500">
            Les questions écrites sur l&apos;ancienne formulation seront remplacées, et la
            planification repart de zéro.
          </p>
          <div className="gap-pas-2 flex">
            <Button type="submit" size="sm" disabled={texte.trim().length < 20}>
              Enregistrer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="gap-pas-3 flex flex-wrap items-baseline">
            {concept.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {concept.uncertain ? <Badge variant="alerte">À vérifier</Badge> : null}
            {concept.archivedByUser ? <Badge>Sorti du cycle</Badge> : null}
          </div>

          <p className="mt-pas-2 text-corps text-stone-900">
            <TexteTechnique>{concept.concept}</TexteTechnique>
          </p>

          {concept.uncertain ? (
            <p className="mt-pas-3 border-alerte pl-pas-3 text-petit border-l-2 text-stone-500">
              Ce passage a été extrait tel que tu l&apos;as déposé, mais il paraît factuellement
              douteux. Personne ne l&apos;a vérifié — aucune question n&apos;a été écrite dessus
              pour ne pas river une erreur.
            </p>
          ) : (
            <Questions nombre={concept.questions} />
          )}

          {/* L'archivage se défait, et l'écran le dit là où le concept se
              trouve — sans quoi « je maîtrise ça » serait un aller sans retour. */}
          {concept.archivedByUser ? (
            <div className="mt-pas-4 gap-pas-3 flex flex-wrap items-center">
              <p className="text-petit text-stone-500">
                Tu l&apos;as déclaré su. Il revient dans trois mois pour vérifier.
              </p>
              <form action={desarchiverConceptAction}>
                <input type="hidden" name="atomId" value={concept.id} />
                <input type="hidden" name="inputId" value={inputId} />
                <Button type="submit" size="sm" variant="outline">
                  Remettre en révision
                </Button>
              </form>
            </div>
          ) : null}

          <div className="mt-pas-4 gap-pas-2 flex flex-wrap">
            {concept.uncertain ? (
              <form action={confirmerConceptAction}>
                <input type="hidden" name="atomId" value={concept.id} />
                <input type="hidden" name="inputId" value={inputId} />
                <Button type="submit" size="sm" variant="outline">
                  Le garder tel quel
                </Button>
              </form>
            ) : null}

            <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(true)}>
              Modifier
            </Button>

            <form action={supprimerConceptAction}>
              <input type="hidden" name="atomId" value={concept.id} />
              <input type="hidden" name="inputId" value={inputId} />
              <Button type="submit" size="sm" variant="ghost">
                Supprimer
              </Button>
            </form>
          </div>
        </>
      )}
    </li>
  );
}
