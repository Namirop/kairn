import type { MetadataRoute } from "next";
import { PAPIER } from "@/lib/design/couleurs-hors-css";
import { ORIGINE_DU_SITE } from "@/lib/site/origine";

/**
 * Manifeste PWA. L'application s'installe depuis le navigateur et s'ouvre en
 * plein écran ; une application mobile native suivra.
 *
 * **Il reste en français, et c'est voulu.** Il est servi à une adresse fixe,
 * mis en cache par le navigateur et demandé sans cookie : il ne peut pas suivre
 * la langue de la personne, seulement en deviner une. Ce qui compte à
 * l'installation — le nom, l'icône — ne dépend d'aucune langue ; la description
 * ne se lit que dans la fenêtre d'installation de Chrome. Le jour où l'anglais
 * pèse plus que le français dans les installations, c'est elle qui change.
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
     * Quand la plateforme capture un lien vers Kairn, elle réutilise la fenêtre
     * de l'application au lieu d'en ouvrir une seconde.
     *
     * Ça ne force personne à capturer quoi que ce soit — c'est le navigateur et
     * l'utilisateur qui en décident, et sur iOS une application posée sur
     * l'écran d'accueil ne le peut pas du tout. D'où le code à six chiffres
     * plutôt qu'un lien pour entrer : la session se crée dans la fenêtre qui l'a
     * demandée, et cette ligne-ci n'est qu'un confort là où elle s'applique.
     */
    launch_handler: { client_mode: "navigate-existing" },
    /**
     * Kairn dans la feuille de partage du système.
     *
     * C'est le raccourci du geste qui existe déjà : sélectionner un passage
     * dans une conversation, un article, une réponse d'assistant, et le déposer
     * sans passer par le presse-papier. Les noms de champs sont ceux du
     * formulaire de dépôt — `texte`, `image` — parce que c'est le même
     * formulaire qui les reçoit à l'arrivée.
     *
     * **L'envoi est intercepté par le service worker**, jamais par une route :
     * ce qui a été partagé est rangé sur l'appareil et repris par le champ, si
     * bien qu'un partage abandonné n'a rien envoyé à personne. La route de même
     * adresse n'existe que pour le cas où le worker ne répond pas.
     *
     * Les quatre types d'image sont ceux que la lecture sait décoder. Déclarer
     * `image/*` ferait apparaître Kairn dans la feuille pour des formats qu'elle
     * refuserait ensuite — un raccourci qui mène à un refus n'est pas un
     * raccourci.
     *
     * Rien de tout ça n'existe sur iOS : une application posée sur l'écran
     * d'accueil ne peut pas s'inscrire dans la feuille de partage. Le
     * copier-coller reste le chemin de tout le monde.
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
     * L'application se déclare elle-même comme application liée.
     *
     * C'est le seul moyen, depuis un onglet ordinaire, de savoir que Kairn est
     * déjà posée sur l'écran d'accueil de cet appareil :
     * `getInstalledRelatedApps()` ne répond que sur ce qui est déclaré ici, et
     * `display-mode: standalone` ne renseigne que sur la fenêtre courante — pas
     * sur celles d'à côté. Sans cette entrée, quelqu'un qui a installé
     * l'application et rouvre le site dans son navigateur se voit proposer de
     * l'installer une seconde fois.
     *
     * `prefer_related_applications` reste faux : la liste sert à reconnaître,
     * pas à détourner l'installation vers autre chose.
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
