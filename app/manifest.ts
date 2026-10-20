import type { MetadataRoute } from "next";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";

/**
 * En français : servi à une adresse fixe, mis en cache et demandé sans cookie,
 * il ne peut pas suivre la langue de la personne. Seule la description en pâtit.
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
     * Un confort seulement : le navigateur décide, et iOS l'ignore — d'où le code
     * à six chiffres plutôt qu'un lien pour se connecter.
     */
    launch_handler: { client_mode: "navigate-existing" },
    /**
     * Absent sur iOS. Les champs sont ceux du formulaire de dépôt. Le service
     * worker intercepte l'envoi et le range sur l'appareil ; la route ne sert que
     * s'il ne répond pas. Les types d'image sont ceux que la lecture décode :
     * `image/*` proposerait Kairn pour des formats refusés ensuite.
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
     * Se déclarer liée à soi-même : seul moyen, depuis un onglet, que
     * `getInstalledRelatedApps()` voie l'installation. La liste sert à reconnaître,
     * pas à préférer.
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
