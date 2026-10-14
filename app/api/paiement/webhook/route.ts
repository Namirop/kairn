import { NextResponse } from "next/server";
import { z } from "zod";
import { SignatureInvalideError } from "@/lib/paiement/erreurs";
import { signalerLePaiementEnEchec } from "@/lib/paiement/signalement-de-webhook";
import { traiterLeWebhook } from "@/lib/paiement/webhook";

/**
 * Le webhook Stripe.
 *
 * Pas de session : la route est publique, et seule la signature du corps
 * l'authentifie. Le corps est lu en texte, jamais en JSON : la signature porte
 * sur les octets exacts, et un aller-retour JSON suffit à la casser.
 *
 * Les codes parlent à Stripe, qui relance trois jours : 400 dit « n'insiste
 * pas », 500 dit « réessaie » — le bon code quand notre catalogue est cassé.
 * Un 500 envoie aussi une alerte (`alerte-de-webhook.ts`) : Stripe a encaissé
 * mais l'abonnement n'a pas bougé, et la personne n'a aucune raison d'écrire.
 */

/**
 * Le type d'événement, pour l'alerte seulement. Le corps n'est pas encore
 * authentifié ici : ce type ne décide de rien, il dit quel événement rejouer.
 */
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

    // Des identifiants, jamais de contenu. Ce journal sert à répondre à « son
    // paiement est passé, pourquoi son compte n'a pas changé ».
    console.info("[paiement] webhook", traitement);

    return NextResponse.json({ recu: true });
  } catch (erreur) {
    if (erreur instanceof SignatureInvalideError) {
      // Pas d'alerte : une signature invalide est un scan ou une relance
      // pendant une rotation de secret. Alerter dessus noierait le canal.
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
