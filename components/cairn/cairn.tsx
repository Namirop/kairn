"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { PierrePosee } from "@/components/cairn/pierre-posee";
import { SolDuCairn } from "@/components/cairn/sol-du-cairn";
import { useAnimationPossible } from "@/components/cairn/use-animation-possible";
import { tracerLeSentier } from "@/lib/domain/cairn-sentier";
import { cn } from "@/lib/utils";

/**
 * Le sentier : une pierre par Atom retenu — consolidé, ou archivé sur
 * déclaration. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 *
 * `nombre` fait la hauteur, `graines` fait les formes : passer les identifiants
 * des Atoms rend l'empilement propre à chacun et stable dans le temps. Sans
 * graines, le composant reste utilisable à partir d'un simple compteur.
 *
 * **Ce n'est plus un seul empilement.** Au-delà d'une dizaine de pierres, une
 * pile unique se rétrécissait en aiguille dans une boîte de largeur fixe ; passé
 * le palier, la pierre suivante ouvre donc un cairn de plus à droite. La règle
 * et la géométrie vivent dans `tracerLeSentier` — ici on ne fait que la
 * dessiner.
 *
 * La pierre du sommet du **dernier** cairn se pose en arrivant : c'est celle
 * qu'on vient de gagner, et son arête porte le lichen.
 *
 * L'animation est un supplément, jamais un préalable : c'est ce que dit
 * `useAnimationPossible`, et le geste de la pose vit dans `PoseDePierre`.
 */
export function Cairn({
  nombre,
  graines,
  className,
  clair = false,
}: {
  nombre: number;
  graines?: string[];
  className?: string;
  /** Sur un panneau de roche, les pierres s'inversent en gris clairs. */
  clair?: boolean;
}) {
  const t = useTranslations("tableau.cairn");
  const immobile = useReducedMotion() ?? false;
  const anime = useAnimationPossible(immobile);
  const { cairns, largeur, hauteur, ySol, total } = tracerLeSentier(nombre, graines);
  // Ce que le dessin dit à qui ne le voit pas.
  const legende =
    total === 0
      ? t("legendeVide")
      : cairns.length > 1
        ? t("legendeSentier", { cairns: cairns.length, total })
        : t("legendePile", { total });

  return (
    <svg
      viewBox={`0 ${-hauteur + ySol} ${largeur} ${hauteur}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={legende}
    >
      <SolDuCairn clair={clair} largeur={largeur} />
      {cairns.map((cairn) => (
        // Le décalage du cairn est porté par ce groupe, et la place de la pierre
        // dans son empilement par le sien : chacun sa translation, aucune à
        // recomposer.
        <g key={cairn.premierRang} transform={`translate(${cairn.decalage} 0)`}>
          {cairn.pierres.map((pierre, rang) => (
            <PierrePosee
              key={pierre.cle}
              pierre={pierre}
              rang={cairn.premierRang + rang}
              total={total}
              derniere={cairn.premierRang + rang === total - 1}
              anime={anime}
              clair={clair}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
