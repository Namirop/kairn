import type { Metadata } from "next";
import { FormulaireDesinscription } from "@/components/compte/formulaire-desinscription";
import { readUnsubscribeToken } from "@/lib/email/unsubscribe";

export const metadata: Metadata = { title: "Ne plus recevoir d'emails", robots: { index: false } };

/**
 * Confirmation de désinscription.
 *
 * L'affichage ne modifie rien : les scanners de messagerie ouvrent les liens
 * des emails, et une désinscription déclenchée par un robot serait une
 * désinscription qu'on n'a pas demandée. Seul le bouton écrit.
 */
export default async function PageDesinscription({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;
  const valide = jeton ? readUnsubscribeToken(jeton) !== null : false;

  return (
    <div className="py-pas-24 mx-auto max-w-md">
      <h1 className="font-display text-h1-app leading-tight font-bold">
        Ne plus recevoir d&apos;emails
      </h1>

      {valide && jeton ? (
        <>
          <p className="mt-pas-3 text-stone-500">
            Ton compte reste intact. Seuls les rappels par email s&apos;arrêtent — tu peux les
            réactiver depuis tes réglages.
          </p>
          <div className="mt-pas-8">
            <FormulaireDesinscription jeton={jeton} />
          </div>
        </>
      ) : (
        <p className="mt-pas-3 text-stone-500">
          Ce lien n&apos;est plus valide. Ouvre le dernier email reçu, ou coupe les rappels depuis
          tes réglages une fois connecté.
        </p>
      )}
    </div>
  );
}
