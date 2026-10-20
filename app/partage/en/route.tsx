import { dessinerLImageDePartage } from "@/lib/site/dessin-de-partage";

/** Sans cette ligne, un gestionnaire GET recomposerait l'image à chaque demande. */
export const dynamic = "force-static";

export function GET() {
  return dessinerLImageDePartage("EN");
}
