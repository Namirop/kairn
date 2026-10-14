"use client";

import { useEffect, useRef } from "react";

/**
 * Amener les questions sous les yeux à l'instant où elles arrivent : elles
 * arrivent sous le pli pendant qu'on lit les concepts, et sans défilement rien
 * ne dit que l'essai est fini. La marge vient du `scroll-mt` de la cible, que
 * `scrollIntoView` respecte.
 *
 * Seul le passage de zéro à quelque chose déclenche : rouvrir un essai abouti
 * ne doit pas sauter par-dessus les concepts qu'on vient demander à revoir.
 *
 * Avec `prefers-reduced-motion`, un saut au lieu d'un glissement, jamais rien :
 * le changement de position est l'information.
 */
export function useArriveeDesQuestions(combien: number) {
  const ancre = useRef<HTMLElement>(null);
  const precedent = useRef(combien);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = combien;

    if (avant > 0 || combien === 0) return;

    const cible = ancre.current;
    if (!cible) return;

    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cible.scrollIntoView({ block: "start", behavior: immobile ? "auto" : "smooth" });
  }, [combien]);

  return ancre;
}
