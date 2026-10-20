"use client";

import { useEffect, useRef } from "react";

/**
 * Amène à l'écran un élément qui apparaît sous le pli. `block: "nearest"`
 * bouge le minimum, rien s'il est visible : recentrer sortirait la question.
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
