// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import type { Metadata } from "next";
import { BlocSignalements } from "@/components/administration/bloc-signalements";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { listerLesSignalementsPagines } from "@/lib/db/signalement";

export const metadata: Metadata = { title: "Signalements · Administration" };

/** Cinq par page : un signalement se lit en entier, et cinq remplissent l'écran. */
const PAR_PAGE = 5;

/**
 * Les questions qu'on a signalées pendant une session.
 *
 * Le rang de page vient de l'URL, donc de n'importe qui : il est ramené dans
 * les bornes par la lecture plutôt que refusé, parce qu'une page vide serait un
 * cul-de-sac là où la dernière page est manifestement ce qu'on voulait.
 */
export const dynamic = "force-dynamic";

export default async function PageSignalements({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await exigerUnAdministrateur();

  const { page } = await searchParams;
  const liste = await listerLesSignalementsPagines(Number.parseInt(page ?? "1", 10), PAR_PAGE);

  return (
    <PageAdmin
      titre="Signalements"
      contexte="Rien n'est régénéré automatiquement : la question signalée sort du tirage, et le signalement garde une copie de ce qu'elle disait — il survit à la suppression du concept."
    >
      <BlocSignalements page={liste} />
    </PageAdmin>
  );
}
