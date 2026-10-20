import { NextResponse } from "next/server";
import { couperLesEmails } from "@/lib/db/reglages-du-compte";
import { lireLeJetonDeDesinscription } from "@/lib/email/desinscription";

/**
 * Sans session : le jeton signé fait foi. POST seul, contre les scanners de
 * messagerie ; la page /desinscription et les clients RFC 8058 postent ici.
 */
export async function POST(request: Request) {
  const jeton =
    new URL(request.url).searchParams.get("jeton") ??
    (await request.formData().catch(() => null))?.get("jeton")?.toString();

  const userId = jeton ? lireLeJetonDeDesinscription(jeton) : null;

  if (!userId) {
    // i18n-ignore — lu par le client mail (RFC 8058) ou le formulaire, qui n'affiche que le statut.
    return NextResponse.json({ erreur: "Lien de désinscription invalide." }, { status: 400 });
  }

  await couperLesEmails(userId);

  return new NextResponse(null, { status: 204 });
}
