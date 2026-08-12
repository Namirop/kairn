import type { Metadata } from "next";
import Link from "next/link";
import { BoutonGoogle } from "@/components/compte/bouton-google";
import { FormulaireConnexion } from "@/components/compte/formulaire-connexion";
import { isGoogleEnabled } from "@/lib/auth/config";
import { RETURN_TO_PARAM, ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Connexion" };

/** Ne suit que les chemins internes : un `suite` venant de l'URL est du client. */
function destination(valeur: string | undefined): string {
  return valeur?.startsWith("/") && !valeur.startsWith("//") ? valeur : ROUTES.aujourdhui;
}

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const brut = params[RETURN_TO_PARAM];
  const suite = destination(Array.isArray(brut) ? brut[0] : brut);

  return (
    <div className="gap-pas-8 flex flex-col">
      <div>
        <h1 className="text-h1-app leading-tight font-bold">Entrer dans Kairn</h1>
        <p className="mt-pas-2 text-petit text-stone-500">
          Ton adresse suffit. On t&apos;envoie un lien, il ouvre ta session — et il crée ton compte
          si tu n&apos;en as pas encore.
        </p>
      </div>

      <FormulaireConnexion suite={suite} />

      {isGoogleEnabled ? (
        <div className="gap-pas-4 flex flex-col">
          <span className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">ou</span>
          <BoutonGoogle suite={suite} />
        </div>
      ) : null}

      <p className="text-petit text-stone-500">
        En continuant, tu acceptes la{" "}
        <Link
          href={ROUTES.confidentialite}
          className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
