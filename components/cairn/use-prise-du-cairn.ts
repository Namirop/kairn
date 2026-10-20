"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * « Le cairn tient le doigt ». Relâché dès que la zone quitte l'écran : la
 * prise bloque le défilement, et qui revient plus tard ne ferait pas le lien
 * avec le bouton resté allumé.
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
