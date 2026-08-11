"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Le temps de réponse d'un passage.
 *
 * Il part à l'affichage de la question et se fige à la validation : le choix
 * d'une option, la vérification d'un trou, la demande de l'étalon. Ce qui suit
 * — lire une correction, se juger, renoncer — n'entre plus dans la mesure. Sans
 * cette règle, le signal le plus précieux du produit ne dirait plus que le
 * temps de lecture de la personne.
 *
 * Le gel est irréversible pour une question donnée : `arreter` appelé deux fois
 * garde la première mesure. C'est ce qui permet de l'appeler sans précaution
 * depuis chacun des chemins de validation.
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

  return { arreter, mesure };
}
