"use client";

import type { ReactNode } from "react";
import { LIBELLE_FACETTE } from "@/components/depots/libelle-facette";
import type { VariantFacet } from "@/lib/db/types";

/**
 * La carte de révision.
 *
 * Elle ne montre jamais le concept — seulement la question. Afficher l'énoncé
 * dont la question est tirée reviendrait à donner la réponse avec l'exercice.
 *
 * L'avancement est là parce qu'une session se finit mieux quand on en voit le
 * bout. Ce n'est ni un score ni une série : il disparaît avec la session.
 *
 * Ce qui vit sous le trait dépend du mode. La session du jour y met « Je
 * maîtrise ça », qui sort le concept du cycle ; l'entraînement libre n'y met
 * rien, puisqu'il ne décide de rien.
 */
export function CarteQuestion({
  rang,
  total,
  facet,
  tags,
  question,
  actions,
  children,
}: {
  rang: number;
  total: number;
  facet: VariantFacet;
  tags: string[];
  question: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="gap-pas-3 flex items-baseline justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
          {LIBELLE_FACETTE[facet]}
        </p>
        <p className="text-mono font-mono text-stone-500 tabular-nums">
          {rang + 1} / {total}
        </p>
      </div>

      <div aria-hidden className="mt-pas-2 h-px w-full bg-stone-300">
        <div
          className="bg-lichen h-px transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${((rang + 1) / total) * 100}%` }}
        />
      </div>

      {tags.length > 0 ? (
        <p className="mt-pas-6 text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
          {tags.join(" · ")}
        </p>
      ) : null}

      <h1 className="mt-pas-3 text-h1-app leading-snug font-bold text-stone-900">{question}</h1>

      {children}

      {actions ? (
        <div className="mt-pas-12 pt-pas-4 border-t border-stone-100">{actions}</div>
      ) : null}
    </section>
  );
}
