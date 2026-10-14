import type { MetadataRoute } from "next";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";

/**
 * Manifeste PWA.
 *
 * Il reste en français : servi à une adresse fixe, mis en cache et demandé sans
 * cookie, il ne peut pas suivre la langue de la personne. Le nom et l'icône
 * n'en dépendent pas ; seule la description, lue dans la fenêtre
 * d'installation de Chrome, est concernée.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kairn",
    short_name: "Kairn",
    description:
      // i18n-ignore — voir plus haut : le manifeste ne suit pas la langue de la requête.
      "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.",
    lang: "fr",
    start_url: "/aujourdhui",
    scope: "/",
    display: "standalone",
    orientation: "portrait",

    /**
     * Un lien capturé réutilise la fenêtre de l'application. Ce n'est qu'un
     * confort : le navigateur décide, et iOS ne le fait pas du tout — d'où le
     * code à six chiffres plutôt qu'un lien pour se connecter.
     */
    launch_handler: { client_mode: "navigate-existing" },
    /**
     * Kairn dans la feuille de partage du système (absent sur iOS). Les noms de
     * champs sont ceux du formulaire de dépôt, qui les reçoit à l'arrivée.
     *
     * L'envoi est intercepté par le service worker et rangé sur l'appareil : un
     * partage abandonné n'envoie rien. La route `/depots/partage` ne sert que si
     * le worker ne répond pas.
     *
     * Les quatre types d'image sont ceux que la lecture sait décoder : `image/*`
     * proposerait Kairn pour des formats refusés ensuite.
     */
    share_target: {
      action: "/depots/partage",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "titre",
        text: "texte",
        url: "lien",
        files: [{ name: "image", accept: ["image/jpeg", "image/png", "image/webp", "image/gif"] }],
      },
    },
    background_color: PAPIER,
    theme_color: PAPIER,
    categories: ["education", "productivity"],

    /**
     * L'application se déclare elle-même comme application liée : c'est le seul
     * moyen, depuis un onglet ordinaire, que `getInstalledRelatedApps()` dise
     * que Kairn est déjà installée, et ne pas reproposer l'installation.
     * `prefer_related_applications` reste faux : la liste sert à reconnaître.
     */
    related_applications: [{ platform: "webapp", url: `${ORIGINE_DU_SITE}/manifest.webmanifest` }],
    prefer_related_applications: false,
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
