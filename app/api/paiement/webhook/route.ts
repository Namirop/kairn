import { NextResponse } from "next/server";
import { z } from "zod";
import { SignatureInvalideError } from "@/lib/paiement/erreurs";
import { signalerLePaiementEnEchec } from "@/lib/paiement/signalement-de-webhook";
import { traiterLeWebhook } from "@/lib/paiement/webhook";

/**
 * Route publique, authentifiée par la seule signature. Corps lu en texte : la
 * signature porte sur les octets exacts, un aller-retour JSON la casse.
 *
 * Stripe relance trois jours : 400 dit « n'insiste pas », 500 « réessaie ». Un
 * 500 alerte aussi (`alerte-de-webhook.ts`) : Stripe a encaissé, l'abonnement n'a
 * pas bougé, et la personne n'a aucune raison d'écrire.
 */

/** Corps non authentifié : ce type ne décide de rien, il dit quel événement rejouer. */
const corpsAnnonce = z.object({ type: z.string() });

function typeAnnonce(corps: string): string | null {
  try {
    const lu = corpsAnnonce.safeParse(JSON.parse(corps));

    return lu.success ? lu.data.type : null;
  } catch {
    // Pas de type à donner ; l'incident en cours de signalement suffit.
    return null;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    // i18n-ignore — réponse à Stripe, jamais lue par une personne
    return NextResponse.json({ erreur: "Requête non signée." }, { status: 400 });
  }

  const corps = await request.text();

  try {
    const traitement = await traiterLeWebhook(corps, signature);

    // Des identifiants seulement ; répond à « payé, mais le compte n'a pas changé ».
    console.info("[paiement] webhook", traitement);

    return NextResponse.json({ recu: true });
  } catch (erreur) {
    if (erreur instanceof SignatureInvalideError) {
      // Pas d'alerte : un scan ou une relance pendant une rotation de secret.
      console.warn("[paiement] signature refusée");

      // i18n-ignore — réponse à Stripe, jamais lue par une personne
      return NextResponse.json({ erreur: "Signature invalide." }, { status: 400 });
    }

    console.error("[paiement] webhook en échec", erreur);
    signalerLePaiementEnEchec({ type: typeAnnonce(corps), erreur });

    // i18n-ignore — réponse à Stripe, jamais lue par une personne
    return NextResponse.json({ erreur: "Traitement impossible." }, { status: 500 });
  }
}
