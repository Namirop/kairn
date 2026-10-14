"use client";

import { useSyncExternalStore } from "react";
import { Info } from "lucide-react";
import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Une explication qui s'ouvre au survol, ou au doigt : une info-bulle seule ne
 * s'ouvre jamais sur un téléphone.
 *
 * Au doigt, une tape et non un appui long, qui appartient déjà au système sur
 * iOS comme sur Android. C'est l'appareil qui décide (pointeur fin), pas la
 * largeur de la fenêtre. Au premier rendu, on suppose le survol possible :
 * sinon un indice tactile clignoterait au chargement sur ordinateur.
 */

const POINTEUR_FIN = "(hover: hover) and (pointer: fine)";

function souscrire(rappel: () => void): () => void {
  const liste = window.matchMedia(POINTEUR_FIN);

  liste.addEventListener("change", rappel);

  return () => liste.removeEventListener("change", rappel);
}

export function useSurvolPossible(): boolean {
  return useSyncExternalStore(
    souscrire,
    () => window.matchMedia(POINTEUR_FIN).matches,
    () => true,
  );
}

/**
 * La marque qui dit qu'il y a quelque chose à ouvrir, au doigt seulement : sans
 * survol, rien d'autre ne fait découvrir la tape.
 */
export function IndiceTactile({ className }: { className?: string }) {
  const survol = useSurvolPossible();

  if (survol) return null;

  return (
    <Info
      aria-hidden
      className={cn("ml-pas-1 inline size-3.5 shrink-0 align-[-0.15em] text-stone-400", className)}
    />
  );
}

/** Encre pleine, angles taillés, pas de flèche : elle nomme, elle ne commente pas. */
const FICHE = cn(
  "px-pas-2 py-pas-1 text-petit z-50 w-fit max-w-56 rounded-xs bg-stone-900 text-stone-50",
  "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
);

export function Infobulle({
  contenu,
  className,
  children,
}: {
  contenu: React.ReactNode;
  /** Posé sur le déclencheur : c'est lui que le composant appelant veut habiller. */
  className?: string;
  children: React.ReactNode;
}) {
  const survol = useSurvolPossible();

  if (survol) {
    return (
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger className={className}>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={8} className={FICHE}>
            {contenu}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger className={className}>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={8}
          collisionPadding={16}
          /* Le focus reste où il était : le porter dans la fiche fait remonter
             la page sur un téléphone et referme le clavier virtuel. */
          onOpenAutoFocus={(evenement) => evenement.preventDefault()}
          className={FICHE}
        >
          {contenu}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
