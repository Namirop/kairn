import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BoutonGoogle } from "@/components/compte/bouton-google";
import { FormulaireConnexion } from "@/components/compte/formulaire-connexion";
import { isGoogleEnabled } from "@/lib/auth/config";
import { RETURN_TO_PARAM, ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

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

  // Demander son adresse à quelqu'un qui est déjà entré lui ferait croire qu'il
  // ne l'est pas, et le renverrait chercher un code dans sa boîte pour une
  // session qu'il a déjà. On le mène là où il allait.
  if (await getCurrentUser()) redirect(suite);

  return (
    <div className="gap-pas-8 flex flex-col">
      <div>
        <h1 className="text-h1-app leading-tight font-bold">Entrer dans Kairn</h1>
        {/* Le même titre porte les deux temps du formulaire — l'adresse, puis le
            code. Cette phrase doit donc rester vraie aux deux : « on t'envoie un
            code » se contredisait avec le « Envoyé à … » affiché juste dessous
            une fois le code parti. Ce que le code crée un compte est dit sous le
            champ d'adresse, là où la question se pose. */}
        <p className="mt-pas-2 text-petit text-stone-500">
          Ton adresse suffit : un code reçu par email ouvre ta session.
        </p>
      </div>

      <FormulaireConnexion suite={suite} />

      {isGoogleEnabled ? (
        <div className="gap-pas-4 flex flex-col">
          <span className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">ou</span>
          <BoutonGoogle suite={suite} />
        </div>
      ) : null}

      {/* Le rappel quotidien est actif dès la création du compte, et sa base
          légale est le contrat : reposer au bon moment est le service même. Encore
          faut-il le dire **au moment où l'on s'engage** — un réglage qu'on
          découvre en recevant le premier email n'a rien annoncé. */}
      <p className="text-petit text-stone-500">
        En continuant, tu acceptes la{" "}
        <Link
          href={ROUTES.confidentialite}
          className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          politique de confidentialité
        </Link>
        . Kairn t&apos;écrit les jours où quelque chose est à revoir, et se coupe d&apos;un clic
        depuis les réglages comme depuis chaque email.
      </p>
    </div>
  );
}
