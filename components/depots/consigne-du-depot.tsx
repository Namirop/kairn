"use client";

import { useEffect, useRef } from "react";
import { PenLine, X } from "lucide-react";
import { LibelleQuiSeRaccourcit } from "@/components/depots/libelle-qui-se-raccourcit";
import { Button } from "@/components/ui/button";
import { CONSIGNE_MAXIMUM } from "@/lib/depots/bornes-du-depot";

/**
 * Ce qu'on dit du dépôt, à côté du dépôt.
 *
 * **Le besoin est étroit et il vaut la peine.** Une capture d'écran montre
 * presque toujours plus que ce qu'on voulait en garder — une barre latérale, un
 * encart, la moitié d'un autre sujet —, et recadrer avant de déposer n'est pas
 * toujours possible. Une phrase suffit à dire ce qu'il faut laisser de côté.
 *
 * **Elle est repliée, et c'est la décision qui compte.** Tout le produit repose
 * sur la vitesse du geste de dépôt : on colle, on dépose. Un second champ posé
 * en permanence sous le premier demanderait à chacun, à chaque dépôt, de décider
 * s'il a quelque chose à y écrire — pour un cas sur vingt. Le bouton se tient
 * dans la rangée de la pièce jointe, avec laquelle il fait paire : deux choses
 * facultatives qu'on joint à un dépôt.
 *
 * Elle ne se retire pas du dépôt une fois écrite : c'est le champ qui se ferme,
 * et le fermer efface ce qu'il portait. Garder une consigne invisible qui
 * partirait quand même serait le pire des deux.
 */

export function BoutonDeConsigne({ onOuvrir }: { onOuvrir: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onOuvrir}>
      <PenLine aria-hidden />
      <LibelleQuiSeRaccourcit complet="Ajouter une consigne" court="Consigne" />
    </Button>
  );
}

export function ChampDeConsigne({
  valeur,
  onChange,
  onFermer,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  onFermer: () => void;
}) {
  const champ = useRef<HTMLTextAreaElement>(null);

  // Le champ vient d'apparaître sur un geste : le curseur y va. Sans ça, on
  // clique « ajouter une consigne » puis on clique une seconde fois dedans.
  useEffect(() => champ.current?.focus(), []);

  const reste = CONSIGNE_MAXIMUM - valeur.length;

  return (
    <div>
      <div className="gap-pas-3 flex items-baseline justify-between">
        <label
          htmlFor="consigne"
          className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          Ta consigne
        </label>
        <button
          type="button"
          onClick={onFermer}
          className="gap-pas-1 text-petit rounded-galet flex items-center text-stone-500 transition-colors hover:text-stone-900"
        >
          Retirer
          <X aria-hidden className="size-3.5" />
        </button>
      </div>

      <textarea
        ref={champ}
        id="consigne"
        name="consigne"
        rows={2}
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        placeholder="N'inclus pas la partie sur les prix"
        // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
        className="p-pas-3 md:text-petit rounded-champ mt-pas-2 field-sizing-content w-full resize-y border border-stone-300 bg-stone-50 text-base leading-relaxed text-stone-900 placeholder:text-stone-500"
      />

      {/* Une seule ligne sous le champ, et elle change de sujet quand la borne
          approche : avant, l'explication ; après, le compte. Deux lignes
          empilées feraient du secondaire l'élément le plus bavard du
          formulaire. */}
      <p className="mt-pas-2 text-petit text-stone-500">
        {reste < 60 ? (
          <span
            className={reste < 0 ? "text-alerte font-mono tabular-nums" : "font-mono tabular-nums"}
          >
            {valeur.length} / {CONSIGNE_MAXIMUM}
          </span>
        ) : (
          "Ce qu'il faut laisser de côté dans ce dépôt. Elle cadre le découpage, elle n'ajoute rien à ce que tu retiens."
        )}
      </p>
    </div>
  );
}
