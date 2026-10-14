import { notFound } from "next/navigation";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLaCapture } from "@/lib/db/retour";

/**
 * La capture jointe à un retour, servie à l'administration et à personne
 * d'autre. C'est la seule route qui rende des octets d'image, et elle doit le
 * rester : ceux d'un dépôt sont effacés dès que l'OCR a rendu son texte.
 *
 * `exigerUnAdministrateur` rend un 404 plutôt qu'un 403 : l'existence d'une
 * capture n'a pas à se confirmer à qui n'y a pas droit. Aucune mise en cache
 * partagée non plus.
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
      // Un fichier qu'on n'a pas écrit, servi depuis notre origine : il
      // s'affiche, il ne s'exécute pas.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
