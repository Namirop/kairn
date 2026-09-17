"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Libellé de champ. Petit, en gris de pierre : la hiérarchie du formulaire vient
 * de la position et du trait sous le champ, pas d'un libellé qui crie.
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("text-petit text-stone-500 select-none peer-disabled:opacity-45", className)}
      {...props}
    />
  );
}

export { Label };
