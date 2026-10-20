import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BoutonGoogle } from "@/components/compte/bouton-google";
import { FormulaireConnexion } from "@/components/compte/formulaire-connexion";
import { googleEstPropose } from "@/lib/auth/config";
import { PARAMETRE_DE_SUITE, ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { cheminDeSuite } from "@/lib/domain/chemin-de-suite";
import { adressePublique } from "@/lib/i18n/adresses";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compte.connexion");

  return { title: t("metaTitre") };
}

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametres = await searchParams;
  const brut = parametres[PARAMETRE_DE_SUITE];
  const suite = cheminDeSuite(Array.isArray(brut) ? brut[0] : brut) ?? ROUTES.aujourdhui;

  if (await lireLUtilisateur()) redirect(suite);

  const t = await getTranslations("compte.connexion");
  const confidentialite = adressePublique(ROUTES.confidentialite, await langueDeLaRequete());

  return (
    <div className="gap-pas-6 md:gap-pas-8 flex flex-col">
      {/* Pas de chapeau : le code s'explique une fois, sous le champ. */}
      <h1 className="text-h1-app leading-tight font-bold">{t("titre")}</h1>

      <FormulaireConnexion suite={suite} />

      {googleEstPropose ? (
        <div className="gap-pas-4 flex flex-col">
          <span className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            {t("ou")}
          </span>
          <BoutonGoogle suite={suite} />
        </div>
      ) : null}

      {/* Le rappel est actif dès la création (base légale : le contrat) : il
          s'annonce au moment où l'on s'engage. */}
      <p className="text-petit text-stone-500">
        {t.rich("consentement", {
          lien: (morceau) => (
            <Link
              href={confidentialite}
              className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
            >
              {morceau}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
