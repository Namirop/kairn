"use client";

import { useEffect, useRef } from "react";

/**
 * Rattrape l'inscription par Google, où aucun formulaire ne porte le fuseau, et
 * le déménagement. Une fois par chargement, seulement s'ils diffèrent.
 */
export function AccordFuseau({ enregistre }: { enregistre: string }) {
  const dejaEnvoye = useRef(false);

  useEffect(() => {
    if (dejaEnvoye.current) return;

    const detecte = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detecte || detecte === enregistre) return;

    dejaEnvoye.current = true;
    void fetch("/api/reglages/fuseau", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone: detecte }),
    }).catch((erreur: unknown) => {
      console.error("Le fuseau horaire n'a pas pu être enregistré.", erreur);
    });
  }, [enregistre]);

  return null;
}
