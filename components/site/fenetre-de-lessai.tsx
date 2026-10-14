"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * La fenêtre où l'essai se joue : l'attente, puis ce qu'elle a donné. Elle ne
 * s'ouvre qu'en réponse au clic sur l'essai, et se ferme à tout moment sans rien
 * annuler : le découpage tourne côté serveur, et la bande garde de quoi rouvrir.
 *
 * Elle ne réutilise pas `ui/dialog.tsx` : celui-ci est une boîte étroite sur
 * papier, celle-ci une feuille plein écran sur téléphone, sur roche, avec un
 * pied qui ne défile pas.
 *
 * Le titre est masqué visuellement, pas absent : Radix exige un nom, et le
 * contenu porte déjà son propre titre, qui change d'un état à l'autre.
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
   * Ce qui ne défile pas, en bas. Réservé au geste qui ferme l'essai : sur un
   * téléphone, un appel à garder posé à la fin d'une liste de concepts se
   * trouve à deux écrans du pouce.
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

        {/*
          Le centrage vit sur une enveloppe `flex` : étirée sur téléphone,
          centrée à partir de `md`, sans `-translate-1/2` (qui floute le texte
          sur certains écrans) ni conflit `inset-0` / `top-1/2`. Cliquer dessus
          ferme quand même : pour Radix, elle est hors du contenu.
        */}
        <div className="md:p-pas-8 fixed inset-0 z-50 flex md:items-center md:justify-center">
          <DialogPrimitive.Content
            className="grain grain-clair md:rounded-carte data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 bg-surface-roche relative flex w-full flex-col overflow-hidden text-stone-50 outline-none md:max-h-[88svh] md:w-full md:max-w-4xl"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">{t("titre")}</DialogPrimitive.Title>

            {/*
              La croix vit dans une barre, pas en absolu : dans le coin, elle
              tombait sous le cairn de l'en-tête du résultat.
            */}
            <div className="px-pas-3 pt-pas-3 md:px-pas-6 md:pt-pas-6 relative z-20 flex shrink-0 justify-end">
              <DialogPrimitive.Close
                className="inline-flex size-10 items-center justify-center rounded-xs text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-50"
                aria-label={t("fermer")}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>

            {/*
              Le contenu défile, la fenêtre non : posé sur l'élément qui défile,
              le grain s'arrêterait au premier écran, et le pied ne resterait pas
              sous le pouce. `ascenseur-sur-roche` remplace le rail gris clair de
              Windows, le plus lumineux de l'écran, sans le masquer : il dit qu'il
              reste des concepts sous le pli.
            */}
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
