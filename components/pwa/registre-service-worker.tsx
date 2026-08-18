"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker. Ne rend rien.
 *
 * Il est posé à la racine et non dans la coquille authentifiée : les critères
 * d'installabilité s'évaluent sur la page où l'on se trouve, et la première page
 * que voit n'importe qui est la page publique. Enregistré plus bas, le
 * navigateur n'aurait rien à proposer tant que personne ne s'est connecté.
 *
 * **En développement, jamais.** Un service worker actif intercepte les
 * navigations pendant que Turbopack recompile, et le jour où il resservirait une
 * page d'un cache on chercherait le bug ailleurs pendant une heure. Pour le
 * vérifier en local, c'est `npm run build` puis `npm start` — l'enregistrement
 * suit le mode, pas un réglage à retenir.
 *
 * `updateViaCache: "none"` : le script lui-même est toujours relu au réseau. Sans
 * lui, un cache HTTP peut figer une version du service worker pour un jour, et
 * une correction déployée n'atteindrait pas les appareils qui en ont le plus
 * besoin.
 */
export function RegistreServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(
      // Pas de rattrapage : un enregistrement qui échoue coûte l'installation,
      // pas l'application. On le trace et on continue.
      (erreur: unknown) => {
        console.error("[pwa] enregistrement du service worker refusé", erreur);
      },
    );
  }, []);

  return null;
}
