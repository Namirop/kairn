"use client";

import { useEffect, useRef } from "react";

/**
 * Réconcilie le fuseau enregistré avec celui du navigateur, une seule fois par
 * chargement et seulement s'ils diffèrent. Ne rend rien.
 *
 * C'est ce qui rattrape l'inscription par Google, où aucun formulaire ne peut
 * porter le fuseau, et le déménagement d'un utilisateur.
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
