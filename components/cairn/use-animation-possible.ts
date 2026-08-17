"use client";

import { useEffect, useState } from "react";

/**
 * Vrai quand la page est regardée et que l'utilisateur accepte le mouvement.
 *
 * L'animation est un supplément, jamais un préalable : l'empilement est rendu
 * posé, et ne s'anime que si la page est effectivement visible. Un onglet ouvert
 * en arrière-plan suspend les rAF — s'il fallait une animation pour révéler les
 * pierres, elles y resteraient invisibles, et on retrouverait un cairn vide en
 * revenant dessus.
 *
 * L'état ne passe qu'une fois à vrai, au premier effet : ce n'est pas un abonnement
 * à la visibilité. Une page ouverte en arrière-plan rend donc l'empilement posé
 * pour toujours, ce qui est exactement ce qu'on veut — l'entrée d'un cairn n'a
 * d'intérêt qu'au moment où on arrive dessus.
 */
export function useAnimationPossible(immobile: boolean): boolean {
  const [possible, setPossible] = useState(false);

  useEffect(() => {
    if (immobile || document.hidden) return;
    setPossible(true);
  }, [immobile]);

  return possible;
}
