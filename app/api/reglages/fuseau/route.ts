import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerLUtilisateur, SessionAbsenteError } from "@/lib/auth/session";
import { poserLeFuseau } from "@/lib/db/reglages-du-compte";
import { fuseauReconnu } from "@/lib/domain/jour-local";

/**
 * L'inscription par formulaire pose déjà le fuseau en en-tête ; ceci couvre
 * Google et le changement de fuseau. L'identité vient de la session, pas du corps.
 */

const schemaDuCorps = z.object({
  timezone: z.string().min(1).max(64).refine(fuseauReconnu, {
    // i18n-ignore — réponse technique d'API, lue par du code et jamais rendue par un écran
    message: "Fuseau horaire inconnu.",
  }),
});

export async function POST(request: Request) {
  let userId: string;

  try {
    userId = (await exigerLUtilisateur()).id;
  } catch (error) {
    if (error instanceof SessionAbsenteError) {
      // i18n-ignore — réponse technique d'API, lue par du code et jamais rendue par un écran
      return NextResponse.json({ erreur: "Session absente." }, { status: 401 });
    }
    throw error;
  }

  const lecture = schemaDuCorps.safeParse(await request.json().catch(() => null));

  if (!lecture.success) {
    // i18n-ignore — réponse technique d'API, lue par du code et jamais rendue par un écran
    return NextResponse.json({ erreur: "Fuseau horaire invalide." }, { status: 400 });
  }

  await poserLeFuseau(userId, lecture.data.timezone);

  return new NextResponse(null, { status: 204 });
}
