import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { TourDentrainement } from "@/components/entrainement/tour-dentrainement";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireTourDentrainement } from "@/lib/db/entrainement";
import { lireReglages } from "@/lib/db/user-settings";

export const metadata: Metadata = { title: "Entraînement" };

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

  return (
    <PileDePanneaux>
      <Panneau surface="papier" mesure="texte" className="md:py-pas-16 flex-1">
        <TourDentrainement premierTour={tour} principeVu={reglages.trainingIntroSeenAt !== null} />
      </Panneau>
    </PileDePanneaux>
  );
}
