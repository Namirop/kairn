import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/fusion-des-classes";

/** Porte un statut, jamais une décoration. */
const badgeVariants = cva(
  "inline-flex items-center gap-pas-1 rounded-galet font-mono text-mono tracking-[0.12em] uppercase",
  {
    variants: {
      variant: {
        default: "text-stone-500",
        du: "text-accent-profond",
        streak: "text-ember-deep",
        alerte: "bg-alerte-surface px-pas-2 py-0.5 text-alerte",
        pose: "bg-surface-ombre px-pas-2 py-0.5 text-stone-500",
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
