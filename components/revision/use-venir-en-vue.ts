"use client";

import { useEffect, useRef } from "react";

/**
 * Amène un élément à l'écran au moment où il apparaît, et seulement s'il en a
 * besoin : sur téléphone, une réponse révélée s'affiche sous le pli.
 *
 * `block: "nearest"` ne bouge rien quand l'élément est déjà visible, et le
 * minimum sinon ; on ne recentre pas, pour garder la question lisible au-dessus.
 * Sous `prefers-reduced-motion`, même destination, sans le trajet.
 */
export function useVenirEnVue<T extends HTMLElement>(actif = true) {
  const cible = useRef<T>(null);

  useEffect(() => {
    const element = cible.current;

    if (!actif || !element) return;

    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    element.scrollIntoView({ behavior: immobile ? "auto" : "smooth", block: "nearest" });
  }, [actif]);

  return cible;
}
