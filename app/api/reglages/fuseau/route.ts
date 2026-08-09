import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthenticatedError } from "@/lib/auth/session";
import { setTimezone } from "@/lib/db/user-settings";
import { isSupportedTimeZone } from "@/lib/domain/local-day";

/**
 * Enregistre le fuseau détecté par le navigateur.
 *
 * L'inscription par formulaire le pose déjà en en-tête ; ce point d'entrée
 * couvre l'arrivée par Google et le cas où l'utilisateur change de fuseau.
 * L'identité vient de la session, jamais du corps de la requête.
 */

const bodySchema = z.object({
  timezone: z.string().min(1).max(64).refine(isSupportedTimeZone, {
    message: "Fuseau horaire inconnu.",
  }),
});

export async function POST(request: Request) {
  let userId: string;

  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ erreur: "Session absente." }, { status: 401 });
    }
    throw error;
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ erreur: "Fuseau horaire invalide." }, { status: 400 });
  }

  await setTimezone(userId, parsed.data.timezone);

  return new NextResponse(null, { status: 204 });
}
