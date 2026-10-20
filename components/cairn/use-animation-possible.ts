"use client";

import { useEffect, useState } from "react";

/**
 * Vrai quand la page est regardée et que le mouvement est accepté. L'empilement
 * est rendu posé : un onglet caché suspend les rAF, et des pierres qui
 * attendraient une animation pour paraître y resteraient invisibles.
 */
export function useAnimationPossible(immobile: boolean): boolean {
  const [possible, setPossible] = useState(false);

  useEffect(() => {
    if (immobile || document.hidden) return;
    // Le rendu de plus est le but : la chute se joue une fois après l'hydratation.
    // Un `useSyncExternalStore` la rejouerait au retour d'un onglet caché.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPossible(true);
  }, [immobile]);

  return possible;
}
