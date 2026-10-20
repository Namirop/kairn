"use client";

import { Crosshair } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Par défaut le balayage est observé sans prendre le geste : la page défile, seul
 * l'horizontal fauche. Enfoncé, le cairn prend tous les gestes partis de lui.
 * Pointeur grossier seulement : à la souris, le survol fauche déjà sans bloquer.
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
        // En haut à droite : la pile s'affine en montant, ce coin reste vide.
        "prise-du-cairn rounded-galet absolute top-0 right-0 hidden h-11 w-11 touch-manipulation items-center justify-center transition-colors duration-200 [@media(pointer:coarse)]:flex",
        // Pas plus pâle : sous l'AA, la commande disparaît. Réglé pour le
        // papier ; sur le ciel, `.ciel .prise-du-cairn` (ciel.css) prend le relais.
        tenu ? "bg-lichen/20 text-lichen-deep" : "text-stone-500",
      )}
    >
      <Crosshair aria-hidden className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

/**
 * La bande que la prise armée soustrait au défilement. Pleine largeur : le geste
 * part souvent hors de la boîte du cairn (62 % sur téléphone), et `touch-action`
 * se lit sur ce que le doigt touche en premier, d'où sa place au-dessus du
 * dessin. Elle n'intercepte rien : le balayage se mesure sur la fenêtre, le
 * tapotement remonte. Un pas de débord, pas deux : au-dessus, 10 px seulement
 * avant le bouton de l'ouverture. Dans un parent `relative` qui borne sa hauteur.
 */
export function BandeDePrise() {
  return (
    <span
      aria-hidden
      className="-inset-y-pas-6 absolute left-1/2 w-screen max-w-none -translate-x-1/2 touch-none"
    />
  );
}
