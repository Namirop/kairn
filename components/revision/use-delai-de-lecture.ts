"use client";

import { useEffect, useState } from "react";

/**
 * Le temps qu'on laisse à une réponse qu'on n'avait pas : sur un format à
 * choix, la main part vers la suite avant que l'œil ait lu la correction.
 *
 * Seulement après un échec : une bonne réponse n'a rien à faire lire. Le
 * passage est déjà écrit dans les deux cas, l'attente ne retarde que
 * l'affichage du suivant.
 */

/** Assez pour lire deux lignes, trop peu pour qu'on aille voir ailleurs. */
export const DELAI_DE_LECTURE_MS = 3000;

/**
 * `false` tant que le délai court, `true` ensuite. Rend `true` d'emblée quand il
 * n'y a rien à lire.
 */
export function useDelaiDeLecture(aLire: boolean): boolean {
  const [lu, setLu] = useState(!aLire);

  useEffect(() => {
    if (!aLire) {
      setLu(true);
      return;
    }

    setLu(false);
    const minuteur = setTimeout(() => setLu(true), DELAI_DE_LECTURE_MS);

    return () => clearTimeout(minuteur);
  }, [aLire]);

  return lu;
}
