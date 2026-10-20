"use client";

import { useEffect, useRef } from "react";

/**
 * Amène les questions sous les yeux à leur arrivée : elles tombent sous le pli
 * pendant qu'on lit les concepts, et rien d'autre ne dit que l'essai est fini.
 * La marge vient du `scroll-mt` de la cible.
 *
 * Seul le passage de zéro déclenche : rouvrir un essai abouti ne doit pas
 * sauter les concepts qu'on demande à revoir. Sous `prefers-reduced-motion`, un
 * saut plutôt que rien : le changement de position est l'information.
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
