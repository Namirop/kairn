"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker. Ne rend rien.
 *
 * Posé à la racine, pas dans la coquille authentifiée : l'installabilité
 * s'évalue sur la page courante, et la première vue est la page publique.
 *
 * Jamais en développement : il intercepterait les navigations pendant que
 * Turbopack recompile. Pour le vérifier en local : `npm run build` puis
 * `npm start`.
 *
 * `updateViaCache: "none"` : sans lui, un cache HTTP peut figer une version du
 * script jusqu'à un jour, et une correction déployée n'arriverait pas.
 */
export function RegistreServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(
      // Un échec coûte l'installation, pas l'application : tracé, sans plus.
      (erreur: unknown) => {
        console.error("[pwa] enregistrement du service worker refusé", erreur);
      },
    );
  }, []);

  return null;
}
