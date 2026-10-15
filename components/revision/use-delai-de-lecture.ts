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
  const [ecoule, setEcoule] = useState(false);
  const [aLirePrecedent, setALirePrecedent] = useState(aLire);

  // Une nouvelle réponse à lire relance le délai : l'état se recale pendant le
  // rendu, sans attendre un effet qui afficherait d'abord l'ancien.
  if (aLire !== aLirePrecedent) {
    setALirePrecedent(aLire);
    setEcoule(false);
  }

  useEffect(() => {
    if (!aLire) return;

    const minuteur = setTimeout(() => setEcoule(true), DELAI_DE_LECTURE_MS);

    return () => clearTimeout(minuteur);
  }, [aLire]);

  return !aLire || ecoule;
}
