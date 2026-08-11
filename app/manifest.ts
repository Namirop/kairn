import type { MetadataRoute } from "next";
import { PAPIER } from "@/lib/design/couleurs-hors-css";

/**
 * Manifeste PWA. L'application s'installe depuis le navigateur et s'ouvre en
 * plein écran ; une application mobile native suivra.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kairn",
    short_name: "Kairn",
    description:
      "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.",
    lang: "fr",
    start_url: "/aujourdhui",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAPIER,
    theme_color: PAPIER,
    categories: ["education", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icones/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
