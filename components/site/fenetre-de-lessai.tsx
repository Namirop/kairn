"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * La fenêtre de l'essai : l'attente, puis le résultat. La fermer n'annule rien,
 * le découpage tourne côté serveur et la bande garde de quoi rouvrir.
 *
 * Pas `ui/dialog.tsx` (boîte étroite sur papier) : ici une feuille plein écran
 * sur téléphone, sur roche, au pied fixe. Le titre est `sr-only` : Radix exige
 * un nom, et le contenu porte déjà le sien, qui change avec l'état.
 */
export function FenetreDeLEssai({
  ouverte,
  surFermeture,
  pied,
  children,
}: {
  ouverte: boolean;
  surFermeture: () => void;
  /**
   * Le bas fixe, réservé au geste qui conclut l'essai : en fin de liste, il
   * serait à deux écrans du pouce sur téléphone.
   */
  pied?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("site.essai.fenetre");

  return (
    <DialogPrimitive.Root
      open={ouverte}
      onOpenChange={(ouvert) => {
        if (!ouvert) surFermeture();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-stone-900/45" />

        {/* Centrage par une enveloppe `flex`, pas par `-translate-1/2` qui
            floute le texte sur certains écrans. Un clic dessus ferme : pour
            Radix, elle est hors du contenu. */}
        <div className="md:p-pas-8 fixed inset-0 z-50 flex md:items-center md:justify-center">
          <DialogPrimitive.Content
            className="grain grain-clair md:rounded-carte data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 bg-surface-roche relative flex w-full flex-col overflow-hidden text-stone-50 outline-none md:max-h-[88svh] md:w-full md:max-w-4xl"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">{t("titre")}</DialogPrimitive.Title>

            {/* Dans une barre et non en absolu : dans le coin, la croix
                tomberait sous le cairn de l'en-tête du résultat. */}
            <div className="px-pas-3 pt-pas-3 md:px-pas-6 md:pt-pas-6 relative z-20 flex shrink-0 justify-end">
              <DialogPrimitive.Close
                className="inline-flex size-10 items-center justify-center rounded-xs text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-50"
                aria-label={t("fermer")}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>

            {/* Seul le contenu défile : sur l'élément qui défile, le grain
                s'arrêterait au premier écran. `ascenseur-sur-roche` éteint le
                rail clair de Windows sans le masquer : il dit qu'il reste des
                concepts sous le pli. */}
            <div className="px-pas-6 pb-pas-8 md:px-pas-12 md:pb-pas-12 ascenseur-sur-roche relative z-10 flex-1 overflow-y-auto">
              {children}
            </div>

            {pied ? (
              <div className="px-pas-6 py-pas-4 md:px-pas-12 md:py-pas-6 relative z-10 shrink-0 bg-stone-800 pb-[max(var(--pas-4),env(safe-area-inset-bottom))] md:pb-[var(--pas-6)]">
                {pied}
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
