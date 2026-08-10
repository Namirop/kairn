import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Bouton retokenisé. Angles quasi droits, aucune ombre, aucun halo : le relief
 * vient du contraste de surface. Le focus est traité globalement par l'outline
 * lichen de globals.css, pas par un ring propre au composant — d'où l'absence
 * d'`outline-none` ici, qui l'effacerait sans rien mettre à la place.
 *
 * Hauteurs calées sur la cible tactile : 44 px pour l'action principale.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xs border border-transparent font-medium whitespace-nowrap transition-colors select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-stone-900 text-stone-50 hover:bg-stone-800",
        outline: "border-stone-300 text-stone-900 hover:bg-stone-100",
        ghost: "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
        link: "text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900",
        destructive: "bg-alerte-surface text-alerte hover:bg-alerte-surface/70",
      },
      size: {
        default: "h-10 px-pas-4 text-petit",
        sm: "h-9 px-pas-3 text-petit",
        lg: "h-11 px-pas-6 text-corps",
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
