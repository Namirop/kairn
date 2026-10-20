"use client";

import { useEffect, useRef } from "react";
import { PenLine, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LibelleQuiSeRaccourcit } from "@/components/depots/libelle-qui-se-raccourcit";
import { Button } from "@/components/ui/button";
import { CONSIGNE_MAXIMUM } from "@/lib/depots/bornes-du-depot";

/**
 * Repliée par défaut : un second champ permanent demanderait une décision à
 * chaque dépôt, pour un cas sur vingt. Fermer efface : une consigne invisible
 * qui partirait quand même serait le pire.
 */

export function BoutonDeConsigne({ onOuvrir }: { onOuvrir: () => void }) {
  const t = useTranslations("depots.formulaire.consigne");

  return (
    <Button type="button" variant="outline" size="sm" onClick={onOuvrir}>
      <PenLine aria-hidden />
      <LibelleQuiSeRaccourcit complet={t("ajouter")} court={t("ajouterCourt")} />
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
  const t = useTranslations("depots.formulaire.consigne");
  const champ = useRef<HTMLTextAreaElement>(null);

  // Le champ vient d'apparaître sur un geste : le focus y va.
  useEffect(() => champ.current?.focus(), []);

  const reste = CONSIGNE_MAXIMUM - valeur.length;

  return (
    <div>
      <div className="gap-pas-3 flex items-baseline justify-between">
        <label
          htmlFor="consigne"
          className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          {t("etiquette")}
        </label>
        <button
          type="button"
          onClick={onFermer}
          className="gap-pas-1 text-petit rounded-galet flex items-center text-stone-500 transition-colors hover:text-stone-900"
        >
          {t("retirer")}
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
        placeholder={t("exemple")}
        // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
        className="p-pas-3 md:text-petit rounded-champ mt-pas-2 field-sizing-content w-full resize-y border border-stone-300 bg-stone-50 text-base leading-relaxed text-stone-900 placeholder:text-stone-500"
      />

      <p className="mt-pas-2 text-petit text-stone-500">
        {reste < 60 ? (
          <span
            className={reste < 0 ? "text-alerte font-mono tabular-nums" : "font-mono tabular-nums"}
          >
            {valeur.length} / {CONSIGNE_MAXIMUM}
          </span>
        ) : (
          t("aide")
        )}
      </p>
    </div>
  );
}
