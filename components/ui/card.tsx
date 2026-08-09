import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Carte retokenisée. Elle n'existe que pour grouper de l'information liée —
 * jamais pour habiller une seule ligne. Le padding est réglé par `densite` :
 * une carte dense et une carte de mise en avant ne respirent pas pareil.
 */
const PADDING = {
  dense: "p-pas-3",
  info: "p-pas-6",
  large: "p-pas-6 md:p-pas-8",
} as const;

function Card({
  className,
  densite = "info",
  ...props
}: React.ComponentProps<"div"> & { densite?: keyof typeof PADDING }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-sm border border-stone-100 bg-stone-50 text-stone-900",
        PADDING[densite],
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-h2-app leading-tight font-bold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-petit text-stone-500", className)}
      {...props}
    />
  );
}

export { Card, CardTitle, CardDescription };
