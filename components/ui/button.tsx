import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Bouton retokenisé. Aucune ombre : le survol change de surface plutôt que
 * d'opacité.
 *
 * Le focus vient de l'outline globale de `app/styles/base.css` : pas
 * d'`outline-none` ici, qui l'effacerait sans rien mettre à la place.
 *
 * `lg` (44 px) est calé sur la cible tactile de l'action principale.
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
          Les variantes pour la roche, où un bouton plein `stone-900` disparaît
          dans le fond. `clair` dit la couleur de l'objet, pas celle du fond,
          comme pour les pierres du cairn.
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
