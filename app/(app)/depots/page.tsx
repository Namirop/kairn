import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { listerDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("depots.liste");

  return { title: t("metaTitre") };
}

export default async function PageDepots() {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const t = await getTranslations("depots.liste");
  const maintenant = new Date();
  const [depots, fuseau] = await Promise.all([
    listerDepots(utilisateur.id),
    lireFuseauUtilisateur(utilisateur.id),
  ]);

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        {/* Même largeur que la liste, pour que le bouton reste près de ce sur
            quoi il agit. Sur mobile, titre centré comme sur « Aujourd'hui ». */}
        <div className="gap-pas-6 md:gap-pas-4 flex flex-col items-center text-center md:flex-row md:flex-wrap md:items-end md:justify-between md:text-left">
          <div>
            <h1 className="text-h1-app leading-tight font-bold">{t("titre")}</h1>
            <p className="mt-pas-2 text-petit mx-auto text-stone-500 md:mx-0">{t("chapeau")}</p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={`${ROUTES.depots}/nouveau`}>{t("deposer")}</Link>
          </Button>
        </div>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depots-liste" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <ListeDepots
          depots={depots}
          maintenant={maintenant}
          fuseau={fuseau}
          titre={null}
          avecLien={false}
          surface="ombre"
        />
      </Panneau>
    </PileDePanneaux>
  );
}
