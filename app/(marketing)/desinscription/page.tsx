import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormulaireDesinscription } from "@/components/compte/formulaire-desinscription";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { lireLeJetonDeDesinscription } from "@/lib/email/desinscription";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.desinscription");

  return { title: t("meta"), robots: { index: false } };
}

/** L'affichage n'écrit rien, le bouton seul : les scanners de messagerie ouvrent les liens. */
export default async function PageDesinscription({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;
  const valide = jeton !== undefined && lireLeJetonDeDesinscription(jeton) !== null;
  const t = await getTranslations("site.desinscription");

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="texte" remplit centre>
        <h1 className="font-display text-h2-site leading-[1.05] font-bold tracking-[-0.02em] text-balance text-stone-900">
          {valide ? t("titre") : t("expireTitre")}
        </h1>

        <p className="mt-pas-4 md:mt-pas-6 text-corps max-w-lg leading-relaxed text-pretty text-stone-500">
          {valide ? t("texte") : t("expireTexte")}
        </p>

        <div className="mt-pas-8 md:mt-pas-12">
          {valide && jeton !== undefined ? (
            <FormulaireDesinscription jeton={jeton} />
          ) : (
            <Button asChild>
              <Link href={ROUTES.reglages}>{t("reglages")}</Link>
            </Button>
          )}
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
