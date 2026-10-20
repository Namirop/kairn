"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Maximize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LignesDeCode } from "@/components/typographie/lignes-de-code";

/**
 * Seule chose posée sur la roche sans être un panneau : un extrait se recopie
 * plus qu'il ne se lit dans le flux. Il s'ouvre en grand : une ligne de code
 * dépasse souvent la carte, et défiler à l'horizontale sur téléphone décourage.
 * La barre existe même sans langage : elle porte le bouton, la forme reste stable.
 */

const CARTE = "rounded-carte bg-surface-roche overflow-hidden";
const BARRE =
  "px-pas-3 py-pas-2 gap-pas-3 flex items-center justify-between border-b border-stone-700";
const ETIQUETTE = "px-pas-1 text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";
const GESTE =
  "gap-pas-1 text-mono inline-flex shrink-0 items-center rounded-xs px-pas-2 py-pas-1 font-mono tracking-[0.1em] text-stone-400 uppercase transition-colors hover:bg-stone-700 hover:text-stone-50 focus-visible:bg-stone-700 focus-visible:text-stone-50";

export function BlocDeCode({ texte, langage }: { texte: string; langage: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const t = useTranslations("tableau.commun.extrait");

  return (
    <DialogPrimitive.Root open={ouvert} onOpenChange={setOuvert}>
      <div className={CARTE}>
        <div className={BARRE}>
          <p className={ETIQUETTE}>{langage ?? "code"}</p>

          <DialogPrimitive.Trigger className={GESTE}>
            <Maximize2 aria-hidden className="size-3.5" />
            {t("agrandir")}
          </DialogPrimitive.Trigger>
        </div>

        <LignesDeCode texte={texte} langage={langage} className="max-h-96" />
      </div>

      <DialogPrimitive.Portal>
        {/* Plus sombre que les autres voiles : on lit, la page derrière peut s'effacer. */}
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-stone-900/85" />

        <DialogPrimitive.Content
          className={`${CARTE} data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col outline-none`}
        >
          {/* Radix refuse un dialogue sans nom ; à l'écran, l'étiquette suffit. */}
          <DialogPrimitive.Title className="sr-only">
            {langage ? t("titreEn", { langage }) : t("titre")}
          </DialogPrimitive.Title>

          <div className={BARRE}>
            <p className={ETIQUETTE}>{langage ?? "code"}</p>

            <DialogPrimitive.Close className={GESTE} aria-label={t("fermerLExtrait")}>
              <X aria-hidden className="size-3.5" />
              {t("fermer")}
            </DialogPrimitive.Close>
          </div>

          <LignesDeCode texte={texte} langage={langage} className="p-pas-4 md:p-pas-6 flex-1" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
