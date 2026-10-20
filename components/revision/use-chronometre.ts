"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Le temps de réponse d'un passage, de l'affichage à la validation : lire la
 * correction ou se juger n'y entre pas. `arreter` garde la première mesure, donc
 * s'appelle depuis chaque chemin. Mémoïsé : une identité neuve relancerait les
 * effets qui en dépendent.
 */
export function useChronometre(question: string | number): {
  arreter: () => void;
  mesure: () => number;
} {
  // Posé par l'effet : lire l'horloge pendant le rendu le rendrait impur.
  const debut = useRef(0);
  const fige = useRef<number | null>(null);

  useEffect(() => {
    debut.current = Date.now();
    fige.current = null;
  }, [question]);

  const arreter = useCallback(() => {
    fige.current ??= Date.now() - debut.current;
  }, []);

  const mesure = useCallback(() => fige.current ?? 0, []);

  return useMemo(() => ({ arreter, mesure }), [arreter, mesure]);
}
