import { notFound } from "next/navigation";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLaCapture } from "@/lib/db/retour";

/**
 * La capture jointe à un retour, servie à l'administration et à personne
 * d'autre.
 *
 * **C'est la seule route du produit qui rende des octets d'image**, et il faut
 * qu'elle le reste. Celle d'un dépôt n'existe pas : ses octets partent dès que
 * l'OCR a rendu son texte, précisément parce qu'une capture montre souvent plus
 * que ce que son auteur croit y montrer. Ici on la garde, puisque c'est elle
 * qu'on vient regarder — et le prix de la garder est cette garde-ci.
 *
 * `exigerUnAdministrateur` rend un 404 plutôt qu'un 403 : l'existence d'une
 * capture n'a pas à se confirmer à qui n'y a pas droit. Aucune mise en cache
 * partagée non plus, pour la même raison.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await exigerUnAdministrateur();

  const { id } = await params;
  const capture = await lireLaCapture(id);

  if (!capture) notFound();

  return new Response(new Uint8Array(capture.donnees), {
    headers: {
      "Content-Type": capture.mediaType,
      "Cache-Control": "private, no-store",
      // Elle s'affiche, elle ne s'exécute pas : une image servie depuis notre
      // origine reste un fichier qu'on n'a pas écrit.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
