"use client";

import { useSyncExternalStore } from "react";
import { Info } from "lucide-react";
import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/fusion-des-classes";

/**
 * Au survol, ou au doigt : une info-bulle seule ne s'ouvre jamais sur un
 * téléphone. Une tape, pas un appui long, qui appartient au système. Le
 * pointeur décide, pas la largeur. Survol supposé au premier rendu : sinon
 * l'indice tactile clignoterait sur ordinateur.
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

/** Au doigt seulement : sans survol, rien d'autre ne fait découvrir la tape. */
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
  /** Posé sur le déclencheur. */
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
          /* Focus laissé en place : sur téléphone, il ferait remonter la page
             et refermerait le clavier. */
          onOpenAutoFocus={(evenement) => evenement.preventDefault()}
          className={FICHE}
        >
          {contenu}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
