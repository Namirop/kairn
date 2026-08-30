"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * L'état « le cairn tient le doigt », et la zone qu'il concerne.
 *
 * **Il se relâche dès que la zone quitte l'écran.** C'est le seul garde-fou de
 * l'affaire : la prise crée exactement le défaut qu'on cherchait à éviter — une
 * part de l'écran où la page ne défile plus — et quelqu'un qui a joué puis qui
 * est descendu lire n'a aucune raison de retrouver ça en remontant une heure
 * plus tard, ni de faire le lien avec un petit bouton allumé. Sortir de vue
 * signifie ici « je ne joue plus » ; revenir jouer coûte un appui.
 */
export function usePriseDuCairn() {
  const refZone = useRef<HTMLDivElement>(null);
  const [tenu, setTenu] = useState(false);

  const basculer = useCallback(() => {
    setTenu((precedent) => !precedent);
  }, []);

  useEffect(() => {
    const zone = refZone.current;
    if (!tenu || !zone) return;

    const observateur = new IntersectionObserver(([entree]) => {
      if (entree && !entree.isIntersecting) setTenu(false);
    });

    observateur.observe(zone);

    return () => {
      observateur.disconnect();
    };
  }, [tenu]);

  return { tenu, basculer, refZone };
}
