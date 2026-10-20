"use client";

import { useEffect, useState } from "react";

/**
 * Après un échec sur un format à choix, la main part vers la suite avant que
 * l'œil ait lu la correction. Le passage est déjà écrit : l'attente ne retarde
 * que l'affichage du suivant.
 */

/** Assez pour lire deux lignes, trop peu pour qu'on aille voir ailleurs. */
export const DELAI_DE_LECTURE_MS = 3000;

/** `false` tant que le délai court ; `true` d'emblée s'il n'y a rien à lire. */
export function useDelaiDeLecture(aLire: boolean): boolean {
  const [ecoule, setEcoule] = useState(false);
  const [aLirePrecedent, setALirePrecedent] = useState(aLire);

  // Recalé pendant le rendu : un effet afficherait d'abord l'ancien état.
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
