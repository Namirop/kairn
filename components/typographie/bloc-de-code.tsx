"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Maximize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LignesDeCode } from "@/components/typographie/lignes-de-code";

/**
 * Un extrait de code cité en bloc.
 *
 * **Il est sur la roche, et c'est la seule chose de ce produit qui s'y pose sans
 * être un panneau.** Le choix n'est pas décoratif : un extrait de code est du
 * texte qu'on ne lit pas, qu'on recopie — il n'appartient pas au flux de la
 * phrase, et la surface le dit mieux qu'un filet ou qu'un encadré. La roche
 * existe déjà dans le produit, elle n'ajoute donc aucune couleur ; c'est la même
 * encre que sur le panneau du cairn.
 *
 * **Il s'ouvre en grand.** Une ligne de code fait cent signes là où la carte d'un
 * dépôt en montre soixante, et sur un téléphone la moitié d'un extrait vit hors
 * du cadre. Défiler à l'horizontale pour lire deux lignes est un geste qu'on ne
 * fait pas : on abandonne. Le bouton ouvre donc l'extrait par-dessus la page,
 * sur un voile qui éteint le reste — c'est le seul endroit du produit où quelque
 * chose demande toute l'attention, et c'est parce que rien d'autre ne permet de
 * le lire.
 *
 * La barre du haut existe toujours, avec ou sans langage : c'est elle qui porte
 * le bouton, et une carte dont l'en-tête apparaît selon le contenu change de
 * forme d'un extrait à l'autre.
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
        {/* Bien plus sombre que le voile des autres dialogues du produit. Ceux-là
            posent une question au-dessus d'une page qu'on doit encore
            reconnaître ; celui-ci sert à lire, et ce qui reste visible derrière
            n'est plus qu'une distraction. */}
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-stone-900/85" />

        <DialogPrimitive.Content
          className={`${CARTE} data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col outline-none`}
        >
          {/* Le titre existe pour les lecteurs d'écran et pour Radix, qui refuse
              un dialogue sans nom. À l'écran, c'est l'étiquette du langage qui
              le dit, et la redire en grand mettrait un titre sur un extrait de
              deux lignes. */}
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
