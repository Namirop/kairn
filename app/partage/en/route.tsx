import { dessinerLImageDePartage } from "@/lib/site/dessin-de-partage";

/**
 * La carte de partage des pages `/en`. Figée au build : sans cette ligne, un
 * gestionnaire GET se rend à chaque demande et recomposerait l'image.
 */
export const dynamic = "force-static";

export function GET() {
  return dessinerLImageDePartage("EN");
}
