"use client";

import { PierreSeule } from "@/components/cairn/pierre-seule";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import type { EtapeDeLAttente } from "@/lib/domain/catalogue-dattente";

/**
 * La phrase qui tourne, pour qu'une chaîne qui travaille ne ressemble pas à un
 * écran coincé. Mise en page d'`EtatVide` sans le composer : son constat est
 * une chaîne, celui-ci se remplace en fondu. Place réservée, sinon le contexte
 * saute quand la phrase change de longueur.
 */
export function AttenteDuDepot({
  etape,
  contexte,
  graine,
}: {
  etape: EtapeDeLAttente;
  /** Fixe : c'est la seule promesse de l'écran. */
  contexte: string;
  graine: string;
}) {
  const phrase = usePhraseQuiTourne(etape);

  return (
    <div className="gap-pas-4 py-pas-6 flex items-start">
      <PierreSeule graine={graine} className="mt-pas-1 w-10 shrink-0" />

      <div>
        <PhraseQuiTourne
          phrase={phrase}
          className="text-corps min-h-[3rem] text-stone-900 md:min-h-[1.5rem]"
        />
        <p className="mt-pas-1 text-petit text-stone-500">{contexte}</p>
      </div>
    </div>
  );
}
