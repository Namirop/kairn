import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Bouton retokenisé. Une pilule : dans l'échelle de formes, l'arrondi total est
 * réservé aux actions — le panneau est le sol, la carte est un objet posé, la
 * pilule est un geste. Aucune ombre, aucun halo : le relief vient du contraste
 * de surface, et le survol change de surface plutôt que d'opacité.
 *
 * Le focus est traité globalement par l'outline lichen de globals.css, pas par
 * un ring propre au composant — d'où l'absence d'`outline-none` ici, qui
 * l'effacerait sans rien mettre à la place.
 *
 * Hauteurs calées sur la cible tactile : 44 px pour l'action principale.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-galet border border-transparent font-medium whitespace-nowrap transition-colors select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-stone-900 text-stone-50 hover:bg-stone-800",
        outline: "border-stone-300 text-stone-900 hover:border-stone-500 hover:bg-surface-ombre",
        ghost: "text-stone-500 hover:bg-surface-ombre hover:text-stone-900",
        link: "text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900",
        destructive: "bg-alerte-surface text-alerte hover:bg-alerte-surface/70",
        /*
          Les trois variantes de la roche.

          Un bouton plein vaut `stone-900` sur `stone-50` : posé sur la roche,
          qui est `#2a2e2c`, il disparaît dans son propre fond. Ce n'est pas un
          réglage de plus, c'est la même figure retournée — sur une surface
          sombre, ce qui appelle à l'action est ce qui capte la lumière.

          `clair` suit la convention des pierres du cairn : le mot dit la couleur
          de l'objet, pas celle du fond qui le porte.
        */
        clair: "bg-stone-50 text-stone-900 hover:bg-stone-100",
        outlineClair: "border-stone-700 text-stone-50 hover:border-stone-500 hover:bg-stone-700",
        linkClair:
          "text-stone-300 underline decoration-stone-700 underline-offset-4 hover:text-stone-50 hover:decoration-stone-300",
      },
      size: {
        default: "h-10 px-pas-6 text-petit",
        sm: "h-9 px-pas-4 text-petit",
        lg: "h-11 px-pas-8 text-corps",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
