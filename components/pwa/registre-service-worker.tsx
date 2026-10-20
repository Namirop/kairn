"use client";

import { useEffect } from "react";

/**
 * À la racine : l'installabilité s'évalue sur la page courante, et la première
 * vue est publique. Jamais en développement, où il intercepterait les
 * navigations pendant que Turbopack recompile (en local : build puis start).
 * `updateViaCache: "none"` : un cache HTTP figerait le script jusqu'à un jour.
 */
export function RegistreServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(
      // Coûte l'installation, pas l'application : tracé, sans plus.
      (erreur: unknown) => {
        console.error("[pwa] enregistrement du service worker refusé", erreur);
      },
    );
  }, []);

  return null;
}
