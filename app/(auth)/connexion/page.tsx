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

  // Déjà connecté : on le mène là où il allait, sans lui redemander un code.
  if (await lireLUtilisateur()) redirect(suite);

  const t = await getTranslations("compte.connexion");
  // La politique de confidentialité a sa version anglaise : on mène à celle qu'on lit.
  const confidentialite = adressePublique(ROUTES.confidentialite, await langueDeLaRequete());

  return (
    <div className="gap-pas-6 md:gap-pas-8 flex flex-col">
      {/* Pas de chapeau : le mécanisme du code est expliqué une fois, sous le
          champ, dans le formulaire. */}
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

      {/* Le rappel quotidien est actif dès la création du compte (base légale :
          le contrat). Il s'annonce ici, au moment où l'on s'engage. */}
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
