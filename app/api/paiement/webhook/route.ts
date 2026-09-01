import { NextResponse } from "next/server";
import { SignatureInvalideError } from "@/lib/paiement/erreurs";
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
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ erreur: "Requête non signée." }, { status: 400 });
  }

  try {
    const traitement = await traiterLeWebhook(await request.text(), signature);

    // Des identifiants, jamais de contenu. Ce journal sert à répondre à « son
    // paiement est passé, pourquoi son compte n'a pas changé ».
    console.info("[paiement] webhook", traitement);

    return NextResponse.json({ recu: true });
  } catch (erreur) {
    if (erreur instanceof SignatureInvalideError) {
      console.warn("[paiement] signature refusée");

      return NextResponse.json({ erreur: "Signature invalide." }, { status: 400 });
    }

    console.error("[paiement] webhook en échec", erreur);

    return NextResponse.json({ erreur: "Traitement impossible." }, { status: 500 });
  }
}
