"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Interrupteur retokenisé.
 *
 * Un réglage qui a deux états se présente comme un interrupteur, pas comme une
 * valeur à lire : « activé » écrit dans une liste demande de chercher où on le
 * change. La piste est un galet, le curseur une pierre claire, et l'état actif
 * porte l'accent — c'est un signal, ce que cet accent est censé faire.
 *
 * Le contour reste visible en position éteinte : une piste sans bord sur une
 * surface claire ne se lit plus comme un objet cliquable.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "rounded-galet peer inline-flex h-6 w-11 shrink-0 items-center border transition-colors",
        "data-[state=unchecked]:bg-surface-ombre data-[state=unchecked]:border-stone-300",
        "data-[state=checked]:bg-accent data-[state=checked]:border-accent-profond",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "rounded-galet pointer-events-none block size-5 transition-transform",
          "data-[state=unchecked]:translate-x-[2px] data-[state=unchecked]:bg-stone-500",
          "data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-stone-50",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
