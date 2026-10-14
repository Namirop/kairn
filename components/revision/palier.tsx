import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Un palier : l'écran sur lequel on tombe quand il n'y a pas de question à
 * poser (journée faite, rien à revoir, session ou tour d'entraînement fini).
 *
 * Centré et titré au corps d'un titre de campagne : c'est le titre qui porte le
 * vide. Une halte, pas une récompense — rien n'y est ajouté pour faire nombre,
 * et l'emblème n'est admis que s'il est l'information elle-même (la pile qu'on
 * a montée).
 */

export type Lien = {
  libelle: string;
  href: string;
  /**
   * Ce que fait cette action, en une phrase. Elle s'affiche sous la paire de
   * boutons, pas sous le sien : elle doit donc nommer l'action dont elle parle.
   */
  precision?: string;
};

function ActionDePalier({ lien, contour = false }: { lien: Lien; contour?: boolean }) {
  return (
    <Button asChild variant={contour ? "outline" : "default"}>
      <Link href={lien.href}>{lien.libelle}</Link>
    </Button>
  );
}

export function Palier({
  embleme,
  intitule,
  titre,
  explication,
  action,
  secondaire,
  bouton,
  pied,
  children,
}: {
  /**
   * Ce qui vient de se passer, dessiné au-dessus du titre : une pile qu'on a
   * montée, jamais un pictogramme de félicitation.
   */
  embleme?: ReactNode;
  /** Ce que ce palier clôt, en petites capitales. Facultatif. */
  intitule?: string;
  titre: string;
  /** Ce qui s'est passé et ce qui vient. Une phrase, deux au plus. */
  explication?: ReactNode;
  action?: Lien;
  secondaire?: Lien;
  /** Une action qui ne mène pas ailleurs — reprendre un tour, par exemple. */
  bouton?: ReactNode;
  /** La porte de sortie discrète, sous tout le reste. */
  pied?: ReactNode;
  /** Ce que ce palier ajoute entre l'explication et les actions. */
  children?: ReactNode;
}) {
  const precisions = [action, secondaire]
    .map((lien) => lien?.precision)
    .filter((precision): precision is string => Boolean(precision));

  return (
    <section className="flex w-full flex-col items-center text-center">
      {embleme ? <div className="mb-pas-6 md:mb-pas-8">{embleme}</div> : null}

      {intitule ? (
        <p className="text-mono mb-pas-4 font-mono tracking-[0.14em] text-stone-500 uppercase">
          {intitule}
        </p>
      ) : null}

      <h1 className="font-display text-h2-site leading-[1.05] font-bold tracking-[-0.02em] text-balance text-stone-900">
        {titre}
      </h1>

      {explication ? (
        <p className="mt-pas-4 md:mt-pas-6 text-corps max-w-lg leading-relaxed text-pretty text-stone-500">
          {explication}
        </p>
      ) : null}

      {children}

      {action || bouton ? (
        /* Les actions forment une paire : mêmes dimensions, même ligne de base.
           Une précision sous un seul bouton décentrait optiquement la rangée. */
        <div className="gap-pas-3 sm:gap-pas-4 mt-pas-8 md:mt-pas-12 flex flex-col items-center sm:flex-row">
          {bouton}

          {action ? <ActionDePalier lien={action} /> : null}

          {secondaire ? <ActionDePalier lien={secondaire} contour /> : null}
        </div>
      ) : null}

      {precisions.length > 0 ? (
        <div className="gap-pas-1 mt-pas-4 flex max-w-md flex-col">
          {precisions.map((precision) => (
            <p key={precision} className="text-petit text-pretty text-stone-500">
              {precision}
            </p>
          ))}
        </div>
      ) : null}

      {pied ? <div className="mt-pas-6 md:mt-pas-8">{pied}</div> : null}
    </section>
  );
}
