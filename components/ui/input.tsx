import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Champ retokenisé. Le trait sous le champ est plus marqué que son contour :
 * on lit une ligne à remplir, pas une boîte. 44 px de haut, taille 16 px sur
 * mobile pour que Safari ne zoome pas à la mise au point.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "px-pas-4 rounded-champ bg-surface-papier h-11 w-full min-w-0 border border-stone-300 border-b-stone-500 text-base transition-colors",
        "placeholder:text-stone-500 hover:border-stone-500",
        "aria-invalid:border-alerte aria-invalid:border-b-alerte",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "md:text-corps",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
