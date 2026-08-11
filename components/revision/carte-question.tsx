"use client";

import type { ReactNode } from "react";
import { LIBELLE_FACETTE } from "@/components/depots/libelle-facette";
import { PileDeSession } from "@/components/revision/pile-de-session";
import type { VariantFacet } from "@/lib/db/types";

/**
 * La carte de révision.
 *
 * Elle ne montre jamais le concept — seulement la question. Afficher l'énoncé
 * dont la question est tirée reviendrait à donner la réponse avec l'exercice.
 *
 * L'avancement est là parce qu'une session se finit mieux quand on en voit le
 * bout. Ce n'est ni un score ni une série : il disparaît avec la session. Il
 * est devenu un empilement — un filet de progression d'un pixel était de la
 * même famille que les traits qu'on vient d'enlever partout.
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
      <div className="gap-pas-4 flex items-end justify-between">
        <div>
          <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
            {LIBELLE_FACETTE[facet]}
          </p>
          {tags.length > 0 ? (
            <p className="mt-pas-1 text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
              {tags.join(" · ")}
            </p>
          ) : null}
        </div>

        <PileDeSession rang={rang} total={total} />
      </div>

      <h1 className="mt-pas-8 text-h1-app leading-snug font-bold text-stone-900">{question}</h1>

      {children}

      {actions ? <div className="mt-pas-12 pt-pas-6">{actions}</div> : null}
    </section>
  );
}
