"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  confirmerConceptAction,
  desarchiverConceptAction,
  modifierConceptAction,
  supprimerConceptAction,
} from "@/app/(app)/depots/actions";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { SuppressionEnDeuxTemps } from "@/components/depots/suppression-en-deux-temps";
import { TexteRiche } from "@/components/typographie/texte-riche";
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
  const t = useTranslations("depots.concept");

  if (nombre === 0) return null;

  return (
    <p className="mt-pas-3 text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
      {t("questionsEcrites", { nombre })}
    </p>
  );
}

export function ConceptCorrigeable({
  concept,
  inputId,
  ancre,
}: {
  concept: ConceptLu;
  inputId: string;
  /** L'ancre du premier concept douteux, visée depuis le chapeau du dépôt. */
  ancre?: string;
}) {
  const t = useTranslations("depots.concept");
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(concept.concept);

  return (
    // Le dégagement de l'ancre vaut la barre du haut, qui est collante : sans
    // lui, le concept visé arrive sous elle et on croit avoir atterri ailleurs.
    <li id={ancre} className="p-pas-6 rounded-carte bg-surface-papier scroll-mt-20 md:scroll-mt-24">
      {edition ? (
        <form action={modifierConceptAction} className="gap-pas-3 flex flex-col">
          <input type="hidden" name="atomId" value={concept.id} />
          <input type="hidden" name="inputId" value={inputId} />
          <label htmlFor={`concept-${concept.id}`} className="sr-only">
            {t("reecrire")}
          </label>
          <textarea
            id={`concept-${concept.id}`}
            name="concept"
            rows={4}
            value={texte}
            onChange={(evenement) => setTexte(evenement.target.value)}
            // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
            className="p-pas-3 md:text-petit rounded-champ bg-surface-ombre w-full resize-y border border-stone-300 text-base leading-relaxed"
          />
          <p className="text-petit text-stone-500">{t("avertissementReecriture")}</p>
          <div className="gap-pas-2 flex">
            <Button type="submit" size="sm" disabled={texte.trim().length < 20}>
              {t("enregistrer")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(false)}>
              {t("annuler")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="gap-pas-3 flex flex-wrap items-baseline">
            {concept.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {concept.uncertain ? <Badge variant="alerte">{t("aVerifier")}</Badge> : null}
            {concept.archivedByUser ? <Badge>{t("sortiDuCycle")}</Badge> : null}
          </div>

          {/* Un concept n'a jamais porté d'extrait de plusieurs lignes en
              production, et le prompt n'en demande pas. `TexteRiche` est là pour
              le jour où : le même texte, lu de la même façon qu'au-dessus, dans
              la carte du dépôt dont il sort. */}
          <div className="mt-pas-2 text-corps text-stone-900">
            <TexteRiche>{concept.concept}</TexteRiche>
          </div>

          {concept.uncertain ? (
            <BlocDetache ton="alerte" className="mt-pas-3">
              <p className="text-petit text-stone-500">{t("douteux")}</p>
            </BlocDetache>
          ) : (
            <Questions nombre={concept.questions} />
          )}

          {/* L'archivage se défait, et l'écran le dit là où le concept se
              trouve — sans quoi « je maîtrise ça » serait un aller sans retour. */}
          {concept.archivedByUser ? (
            <div className="mt-pas-4 gap-pas-3 flex flex-wrap items-center">
              <p className="text-petit text-stone-500">{t("declareSu")}</p>
              <form action={desarchiverConceptAction}>
                <input type="hidden" name="atomId" value={concept.id} />
                <input type="hidden" name="inputId" value={inputId} />
                <Button type="submit" size="sm" variant="outline">
                  {t("remettreEnRevision")}
                </Button>
              </form>
            </div>
          ) : null}

          {/* La suppression passe par la même confirmation que celle d'un dépôt.
              Elle partait ici d'un seul clic, alors qu'elle emporte autant : les
              questions écrites sur ce concept et tous les passages qui les
              citent. Un doigt sur un téléphone n'a aucun moyen de revenir en
              arrière. */}
          <div className="mt-pas-4">
            <SuppressionEnDeuxTemps
              action={supprimerConceptAction}
              champs={{ atomId: concept.id, inputId }}
              declencheur={t("supprimer")}
              confirmation={t("supprimerCeConcept")}
              consequence={t("consequence")}
              taille="sm"
              avant={
                <>
                  {concept.uncertain ? (
                    <form action={confirmerConceptAction}>
                      <input type="hidden" name="atomId" value={concept.id} />
                      <input type="hidden" name="inputId" value={inputId} />
                      <Button type="submit" size="sm" variant="outline">
                        {t("garderTelQuel")}
                      </Button>
                    </form>
                  ) : null}

                  <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(true)}>
                    {t("modifier")}
                  </Button>
                </>
              }
            />
          </div>
        </>
      )}
    </li>
  );
}
