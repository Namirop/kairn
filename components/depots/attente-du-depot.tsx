"use client";

import { PierreSeule } from "@/components/cairn/pierre-seule";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import type { EtapeDeLAttente } from "@/lib/domain/catalogue-dattente";

/**
 * Ce qu'on montre d'un dépôt tant qu'il n'a rien donné.
 *
 * **Le même dispositif que l'essai de la landing, sur l'écran d'un dépôt.** La
 * voix de l'attente existait déjà, et elle ne servait qu'aux visiteurs : qui
 * dépose depuis son compte voyait une étiquette grise et deux phrases immobiles,
 * pendant quinze à quarante secondes. Rien ne distinguait une chaîne qui tourne
 * d'un écran resté coincé, et c'est précisément à ce moment-là qu'on se demande
 * si le produit a planté.
 *
 * La mise en page est celle d'`EtatVide` — la pierre au sol, le constat, le
 * contexte — parce que c'est bien la même chose qu'on regarde : un écran qui n'a
 * encore rien à montrer. Seule la première ligne change, et c'est tout ce qu'on
 * lui demande. Elle n'est pas composée avec `EtatVide` pour autant : son constat
 * est un paragraphe qui se remplace en fondu, là où `EtatVide` attend une chaîne
 * de caractères, et lui faire accepter les deux aurait coûté plus de détours que
 * la ligne de balisage qu'on répète ici.
 *
 * La place de la phrase est réservée : deux lignes sur téléphone, une sur écran
 * large. Sans ça, une phrase qui passe de une à deux lignes pousse le contexte
 * vers le bas au milieu de l'attente, ce qui se lit comme un défaut d'affichage.
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
