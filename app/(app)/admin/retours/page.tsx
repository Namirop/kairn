// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import type { Metadata } from "next";
import { BlocRetours } from "@/components/administration/bloc-retours";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { listerLesRetoursPagines } from "@/lib/db/retour";

export const metadata: Metadata = { title: "Retours · Administration" };

/** Cinq par page : un retour se lit en entier, et cinq remplissent l'écran. */
const PAR_PAGE = 5;

/**
 * Ce que les comptes disent du produit lui-même.
 *
 * Le rang de page vient de l'URL, donc de n'importe qui : il est ramené dans les
 * bornes par la lecture plutôt que refusé, parce qu'une page vide serait un
 * cul-de-sac là où la dernière page est manifestement ce qu'on voulait.
 */
export const dynamic = "force-dynamic";

export default async function PageRetours({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await exigerUnAdministrateur();

  const { page } = await searchParams;
  const liste = await listerLesRetoursPagines(Number.parseInt(page ?? "1", 10), PAR_PAGE);

  return (
    <PageAdmin
      titre="Retours"
      contexte="Ce qui ne va pas ailleurs que dans une question : une logique qui surprend, un mot de travers, un écran qui déborde. Rien de tout ça n'apparaît dans les compteurs."
    >
      <BlocRetours page={liste} />
    </PageAdmin>
  );
}
