import { NextResponse } from "next/server";
import { optOutOfEmails } from "@/lib/db/user-settings";
import { readUnsubscribeToken } from "@/lib/email/unsubscribe";

/**
 * Désinscription en un clic, sans session : le jeton signé du lien fait foi.
 *
 * Seul POST écrit, ce qui protège des scanners de messagerie qui suivent les
 * liens à l'ouverture. La page /desinscription poste ce formulaire, et les
 * clients qui gèrent RFC 8058 postent directement ici.
 */
export async function POST(request: Request) {
  const jeton =
    new URL(request.url).searchParams.get("jeton") ??
    (await request.formData().catch(() => null))?.get("jeton")?.toString();

  const userId = jeton ? readUnsubscribeToken(jeton) : null;

  if (!userId) {
    // i18n-ignore — lu par le client mail (RFC 8058) ou le formulaire, qui n'affiche que le statut.
    return NextResponse.json({ erreur: "Lien de désinscription invalide." }, { status: 400 });
  }

  await optOutOfEmails(userId);

  return new NextResponse(null, { status: 204 });
}
