"use client";

import { useTranslations } from "next-intl";
import { PileEnConstruction } from "@/components/cairn/pile-en-construction";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import { Button } from "@/components/ui/button";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Les quelques secondes où le découpage tourne, dans la fenêtre de l'essai :
 * de 2,5 à 15 s en production, 6,3 de médiane. Un écran immobile fait fermer
 * l'onglet juste avant le résultat.
 *
 * L'empilement est celui de l'attente de l'application. La phrase qui tourne
 * (`lib/domain/phrases-dattente.ts`) est masquée aux lecteurs d'écran : dans la
 * région `aria-live`, elle serait relue toutes les trois secondes. Ils
 * n'entendent que la promesse stable du bas.
 *
 * Pas d'étapes racontées (« lecture… découpage… ») : l'extraction est un seul
 * appel, on n'en connaît pas l'avancement. Pas de squelette non plus : dans une
 * fenêtre, le changement de hauteur est la révélation.
 */
export function ConceptsEnAttente({ attente }: { attente: EtatDeLAttente }) {
  const t = useTranslations("site.essai.attente");
  const phrase = usePhraseQuiTourne("DECOUPAGE");

  return (
    <div className="gap-pas-6 flex flex-col" role="status" aria-live="polite">
      <div className="gap-pas-4 flex items-center">
        <PileEnConstruction clair className="w-10 shrink-0 md:w-14" />

        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50">
          {t("titre")}
        </h2>
      </div>

      <PhraseQuiTourne phrase={phrase} className="text-stone-300" />

      <p className="text-petit min-h-5 max-w-2xl text-stone-400">
        {attente === "LONGUE" ? t("longue") : t("courte")}
      </p>
    </div>
  );
}

/**
 * L'écran de l'abandon, à 90 s (`ABANDON_MS`), quand l'interrogation s'arrête
 * pour de bon — avant, `ConceptsEnAttente` reste affiché, car l'écran cherche
 * encore. Le cas est réel : un job reporté par le plafond journalier d'appels
 * repartira, mais pas dans la minute.
 *
 * Le texte doit rester vrai : le traitement continue côté serveur même si la
 * fenêtre se ferme, et le cookie de visite (sept jours) suffit à retrouver ses
 * concepts en revenant.
 */
export function AttenteAbandonnee({ onVerifier }: { onVerifier: () => void }) {
  const t = useTranslations("site.essai.attente");

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50">
        {t("abandonTitre")}
      </h2>

      <p className="text-corps max-w-xl text-stone-300">{t("abandonTexte")}</p>

      <div className="mt-pas-1">
        <Button type="button" variant="outlineClair" onClick={onVerifier}>
          {t("verifier")}
        </Button>
      </div>
    </div>
  );
}
