import { notFound } from "next/navigation";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLaCapture } from "@/lib/db/retour";

/**
 * Seule route qui rende des octets d'image, et elle doit le rester : ceux d'un
 * dépôt sont effacés après l'OCR. 404 plutôt que 403 : l'existence d'une capture
 * ne se confirme pas à qui n'y a pas droit.
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
      // Fichier étranger servi depuis notre origine : il s'affiche, sans s'exécuter.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
