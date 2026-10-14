"use client";

import { PierreSeule } from "@/components/cairn/pierre-seule";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import type { EtapeDeLAttente } from "@/lib/domain/catalogue-dattente";

/**
 * Ce qu'on montre d'un dépôt tant qu'il n'a rien donné : la phrase qui tourne
 * de l'essai, pour qu'une chaîne qui travaille ne ressemble pas à un écran
 * coincé.
 *
 * La mise en page reprend celle d'`EtatVide` sans le composer : son constat est
 * une chaîne, celui-ci un paragraphe qui se remplace en fondu.
 *
 * La place de la phrase est réservée (deux lignes sur téléphone, une sur écran
 * large), sinon le contexte saute quand elle change de longueur.
 */
export function AttenteDuDepot({
  etape,
  contexte,
  graine,
}: {
  etape: EtapeDeLAttente;
  /** Ce qui arrive ensuite. Fixe, lui : c'est la seule promesse de l'écran. */
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
