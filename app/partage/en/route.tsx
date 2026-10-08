import { dessinerLImageDePartage } from "@/lib/site/dessin-de-partage";

/**
 * La carte de partage des pages `/en`, à une adresse qui porte sa langue.
 *
 * Figée au build comme sa sœur française : sans cette ligne, un gestionnaire
 * GET se rend à chaque demande, et chaque aperçu recomposerait l'image.
 */
export const dynamic = "force-static";

export function GET() {
  return dessinerLImageDePartage("EN");
}
