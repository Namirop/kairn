import { dessinerLImageDePartage, TAILLE_DE_PARTAGE } from "@/lib/site/dessin-de-partage";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * L'aperçu d'un lien vers Kairn, en français : la carte des adresses sans
 * préfixe. Le dessin, ses choix et ses raisons sont dans
 * `lib/site/dessin-de-partage.tsx`, partagé avec la carte anglaise.
 */
export const alt = MESSAGES.FR.site.partage.alt;
export const size = TAILLE_DE_PARTAGE;
export const contentType = "image/png";

export default function Image() {
  return dessinerLImageDePartage("FR");
}
