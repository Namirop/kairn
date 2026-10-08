import { NextResponse } from "next/server";
import { z } from "zod";
import { SignatureInvalideError } from "@/lib/paiement/erreurs";
import { signalerLePaiementEnEchec } from "@/lib/paiement/signalement-de-webhook";
import { traiterLeWebhook } from "@/lib/paiement/webhook";

/**
 * Ce que Stripe vient nous dire.
 *
 * Pas de session : Stripe n'en a pas. C'est la signature du corps qui
 * authentifie la requête, et rien d'autre — la route est publique et doit le
 * rester, donc tout ce qui n'est pas signé par le secret est refusé avant
 * d'être lu.
 *
 * Le corps est lu en texte et jamais en JSON. La signature porte sur les octets
 * exacts : les reparser puis les resérialiser, même à l'identique, suffit à la
 * casser.
 *
 * **Les codes de retour parlent à Stripe**, qui relance pendant trois jours ce
 * qu'il n'a pas réussi à livrer. 400 dit « n'insiste pas, ta requête est
 * mauvaise » ; 500 dit « réessaie, c'est moi » — et c'est le bon code quand
 * notre catalogue est cassé, parce que la relance réussira une fois réparé.
 *
 * **Et un 500 réveille quelqu'un**, depuis le 13/09/2026. Un webhook en échec
 * est la seule panne du produit qui coûte de l'argent à quelqu'un d'autre :
 * Stripe a encaissé, la ligne d'abonnement n'a pas bougé, et l'écran de la
 * personne affiche « Gratuit ». Elle n'a aucune raison de penser à écrire, et
 * les trois jours de relance s'écoulent sans que personne ne regarde le journal.
 * Voir `alerte-de-webhook.ts`.
 */

/**
 * Le type d'événement, lu dans le corps pour le seul besoin de l'alerte.
 *
 * Ce corps n'est pas authentifié à ce stade — l'échec a pu survenir avant même
 * la vérification de signature, quand c'est la configuration qui manque. Ce
 * qu'on en tire ne décide donc de rien : c'est une ligne dans un email qu'on
 * s'envoie à soi-même, pour savoir quel événement rejouer.
 */
const corpsAnnonce = z.object({ type: z.string() });

function typeAnnonce(corps: string): string | null {
  try {
    const lu = corpsAnnonce.safeParse(JSON.parse(corps));

    return lu.success ? lu.data.type : null;
  } catch {
    // Un corps qui n'est pas du JSON n'a pas de type à donner. Ce n'est pas un
    // incident de plus : celui qu'on est en train de signaler suffit.
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
      // Pas d'alerte : c'est du bruit. Une signature invalide, c'est un scan
      // sur une route publique, ou une relance pendant une rotation de secret.
      // Alerter dessus noierait le canal, et un canal noyé ne se lit plus.
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
