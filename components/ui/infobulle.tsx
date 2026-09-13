"use client";

import { useSyncExternalStore } from "react";
import { Info } from "lucide-react";
import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Une explication qui s'ouvre au survol, ou au doigt.
 *
 * **L'info-bulle seule ne s'ouvrait pas sur un téléphone, et c'est par
 * construction.** Une info-bulle répond à un survol ; un doigt ne survole rien.
 * Trois explications du tableau de bord — ce que compte le cairn, ce qu'est une
 * série, d'où vient le niveau — n'existaient donc que sur un ordinateur, sur le
 * seul écran que tout le monde ouvre, et sur un produit qui s'installe d'abord
 * sur un téléphone.
 *
 * **Au doigt, c'est une tape, pas un appui long.** L'appui long appartient déjà
 * au système sur iOS comme sur Android — sélection, menu contextuel, aperçu de
 * lien — et le disputer donne un geste qui marche une fois sur deux. Il n'est
 * annoncé nulle part, en plus : personne n'appuie longuement sur un chiffre pour
 * voir ce qui se passe. Une tape s'essaie.
 *
 * **L'appareil décide, pas la largeur de la fenêtre.** Un point d'interrogation
 * ouvert à `md` aurait donné le comportement tactile à une fenêtre étroite sur un
 * ordinateur, et le comportement de survol à une tablette tenue à l'horizontale.
 * Ce qui compte ici est la présence d'un pointeur fin, et le navigateur sait le
 * dire.
 *
 * Au premier rendu, on suppose le survol possible : c'est le cas où une
 * hésitation se verrait — un indice tactile qui clignote au chargement sur un
 * ordinateur. Sur un téléphone, la bascule se fait avant que le doigt n'arrive.
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
 * La marque qui dit qu'il y a quelque chose à ouvrir, et seulement au doigt.
 *
 * Sur un ordinateur, le survol est sa propre découverte : on passe dessus, la
 * fiche s'ouvre, personne n'avait besoin d'être prévenu. Au doigt il n'y a pas
 * de survol, donc pas de découverte — sans cette marque, la tape existe mais
 * personne ne l'essaie. Elle est petite, grise, et se pose contre l'étiquette
 * qu'elle concerne.
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
          /* Le focus reste où il était. Le porter dans la fiche fait remonter la
             page sur un téléphone, et referme le clavier virtuel s'il était
             ouvert — pour deux lignes qu'on vient seulement de lire. */
          onOpenAutoFocus={(evenement) => evenement.preventDefault()}
          className={FICHE}
        >
          {contenu}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
