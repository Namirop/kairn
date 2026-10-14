"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Le temps de réponse d'un passage.
 *
 * Il part à l'affichage de la question et se fige à la validation (option
 * choisie, trou vérifié, réponse révélée) : lire la correction ou se juger
 * n'entre pas dans la mesure.
 *
 * Le gel est irréversible pour une question : `arreter` appelé deux fois garde
 * la première mesure, ce qui permet de l'appeler depuis chaque chemin.
 *
 * L'objet rendu est mémoïsé : une identité neuve à chaque rendu relancerait les
 * effets qui le prennent en dépendance.
 */
export function useChronometre(question: string | number): {
  arreter: () => void;
  mesure: () => number;
} {
  const debut = useRef(Date.now());
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
