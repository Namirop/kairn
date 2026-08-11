import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Carte retokenisée. Elle n'existe que pour grouper de l'information liée —
 * jamais pour habiller une seule ligne. Le padding est réglé par `densite` :
 * une carte dense et une carte de mise en avant ne respirent pas pareil.
 *
 * Elle se distingue par sa surface, pas par un trait d'un pixel : une bordure
 * fine sur un fond presque identique, c'est ce qui donnait à l'application son
 * air de document. `surface` dit sur quoi la carte est posée — sur le papier
 * elle prend l'ombre, sur l'ombre elle prend le papier.
 */
const PADDING = {
  dense: "p-pas-4",
  info: "p-pas-6",
  large: "p-pas-6 md:p-pas-8",
} as const;

const POSEE_SUR = {
  papier: "bg-surface-ombre text-stone-900",
  ombre: "bg-surface-papier text-stone-900",
  roche: "bg-stone-800 text-stone-50",
} as const;

function Card({
  className,
  densite = "info",
  surface = "papier",
  ...props
}: React.ComponentProps<"div"> & {
  densite?: keyof typeof PADDING;
  surface?: keyof typeof POSEE_SUR;
}) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-carte", POSEE_SUR[surface], PADDING[densite], className)}
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
