import { dessinerLImageDePartage, TAILLE_DE_PARTAGE } from "@/lib/site/dessin-de-partage";
import { MESSAGES } from "@/lib/i18n/messages";

/** La carte des adresses sans préfixe ; le dessin vit dans `lib/site/dessin-de-partage.tsx`. */
export const alt = MESSAGES.FR.site.partage.alt;
export const size = TAILLE_DE_PARTAGE;
export const contentType = "image/png";

export default function Image() {
  return dessinerLImageDePartage("FR");
}
