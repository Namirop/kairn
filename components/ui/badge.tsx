import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge retokenisé. Pas de pilule pastel : un libellé technique en mono, très
 * petit, en majuscules espacées. Il porte un statut, jamais une décoration.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-pas-1 rounded-xs font-mono text-mono tracking-[0.12em] uppercase",
  {
    variants: {
      variant: {
        default: "text-stone-500",
        du: "text-lichen-deep",
        streak: "text-ember-deep",
        alerte: "bg-alerte-surface px-pas-2 py-px text-alerte",
        pose: "bg-stone-100 px-pas-2 py-px text-stone-500",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
