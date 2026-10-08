import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TourDentrainement } from "@/components/entrainement/tour-dentrainement";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireTourDentrainement } from "@/lib/db/entrainement";
import { lireReglages } from "@/lib/db/user-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("revision.pages");

  return { title: t("entrainement") };
}

/**
 * L'entraînement libre.
 *
 * Recalculé à chaque visite comme la session : le tour dépend de ce qui a déjà
 * été travaillé, et deux ouvertures d'affilée ne doivent pas resservir les
 * mêmes questions.
 */
export const dynamic = "force-dynamic";

export default async function PageEntrainement() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const [tour, reglages] = await Promise.all([
    lireTourDentrainement(utilisateur.id),
    lireReglages(utilisateur.id),
  ]);

  // Le tour porte sa propre scène — colonne de questions et rail d'état —, et
  // ce qui l'encadre reste une pile de panneaux comme le reste de l'application.
  return (
    <TourDentrainement premierTour={tour} principeVu={reglages.trainingIntroSeenAt !== null} />
  );
}
