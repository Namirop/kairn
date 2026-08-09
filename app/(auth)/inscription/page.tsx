import type { Metadata } from "next";
import Link from "next/link";
import { BoutonGoogle } from "@/components/compte/bouton-google";
import { FormulaireInscription } from "@/components/compte/formulaire-inscription";
import { isGoogleEnabled } from "@/lib/auth/config";
import { ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Créer un compte" };

export default function PageInscription() {
  return (
    <div className="gap-pas-8 flex flex-col">
      <div>
        <h1 className="text-h1-app leading-tight font-bold">Poser la première pierre</h1>
        <p className="mt-pas-2 text-petit text-stone-500">
          Dépose ce que tu apprends. Cairn le découpe et te le repose au bon moment.
        </p>
      </div>

      <FormulaireInscription suite={ROUTES.aujourdhui} />

      {isGoogleEnabled ? (
        <div className="gap-pas-4 flex flex-col">
          <span className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">ou</span>
          <BoutonGoogle suite={ROUTES.aujourdhui} />
        </div>
      ) : null}

      <p className="text-petit text-stone-500">
        Déjà un compte ?{" "}
        <Link
          href={ROUTES.connexion}
          className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
