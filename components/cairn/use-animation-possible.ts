"use client";

import { useEffect, useState } from "react";

/**
 * Vrai quand la page est regardée et que l'utilisateur accepte le mouvement.
 *
 * L'animation est un supplément, jamais un préalable : l'empilement est rendu
 * posé, et ne s'anime que si la page est visible. Un onglet en arrière-plan
 * suspend les rAF, et des pierres qui attendraient une animation pour paraître
 * y resteraient invisibles.
 *
 * L'état ne passe à vrai qu'au premier effet, sans abonnement à la visibilité :
 * une page ouverte en arrière-plan garde l'empilement posé.
 */
export function useAnimationPossible(immobile: boolean): boolean {
  const [possible, setPossible] = useState(false);

  useEffect(() => {
    if (immobile || document.hidden) return;
    setPossible(true);
  }, [immobile]);

  return possible;
}
