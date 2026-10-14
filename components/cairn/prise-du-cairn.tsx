"use client";

import { Crosshair } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * L'interrupteur qui donne le cairn au doigt.
 *
 * Par défaut le balayage tactile est observé sans prendre le geste : la page
 * défile toujours, et seul un geste horizontal fauche l'empilement. Enfoncé, ce
 * bouton donne au cairn les gestes qui partent de lui, dans toutes les
 * directions, et la page ne défile plus sous eux.
 *
 * Il ne se montre qu'au pointeur grossier : à la souris, le survol fauche déjà
 * sans rien bloquer. La croix reprend le curseur que la souris a sur cette zone.
 */
export function PriseDuCairn({ tenu, surBascule }: { tenu: boolean; surBascule: () => void }) {
  const t = useTranslations("tableau.cairn");

  return (
    <button
      type="button"
      onClick={surBascule}
      aria-pressed={tenu}
      aria-label={t("jouer")}
      className={cn(
        /* Cible de 44 px pour un glyphe de 16. En haut à droite : la pile
           s'affine en montant et ses pierres tombent vers le bas, le coin
           reste vide. */
        "prise-du-cairn rounded-galet absolute top-0 right-0 hidden h-11 w-11 touch-manipulation items-center justify-center transition-colors duration-200 [@media(pointer:coarse)]:flex",
        /* Au repos, le gris de second plan et pas plus pâle : en dessous du
           contraste AA, la commande disparaît. Ce gris est réglé pour le
           papier ; sur le ciel de l'ouverture, `.ciel .prise-du-cairn`
           (sky.css) lui donne une encre lisible. */
        tenu ? "bg-lichen/20 text-lichen-deep" : "text-stone-500",
      )}
    >
      <Crosshair aria-hidden className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

/**
 * La bande que la prise armée soustrait au défilement.
 *
 * Elle traverse toute la largeur : le geste qui fauche part souvent dans la
 * marge autour de la boîte du cairn (62 % de la largeur sur téléphone), et
 * `touch-action` se lit sur ce que le doigt touche en premier.
 *
 * Elle se pose au-dessus du dessin pour être touchée en premier, sans rien
 * intercepter : le balayage est mesuré sur la fenêtre, le tapotement remonte au
 * bloc qui l'écoute.
 *
 * Elle déborde d'un pas en haut et en bas, pas deux : au-dessus, il ne reste que
 * 10 px avant le bouton de l'ouverture.
 *
 * À placer dans un parent `relative` qui borne sa hauteur.
 */
export function BandeDePrise() {
  return (
    <span
      aria-hidden
      className="-inset-y-pas-6 absolute left-1/2 w-screen max-w-none -translate-x-1/2 touch-none"
    />
  );
}
