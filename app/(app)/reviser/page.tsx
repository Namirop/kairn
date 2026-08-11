import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { RienAReviser } from "@/components/revision/rien-a-reviser";
import { SessionDeRevision } from "@/components/revision/session-de-revision";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";

export const metadata: Metadata = { title: "Réviser" };

/**
 * La session du jour.
 *
 * La page est recalculée à chaque visite : ce qui est dû dépend de l'heure qu'il
 * est chez l'utilisateur, et une session servie depuis un cache serait celle
 * d'un autre moment.
 */
export const dynamic = "force-dynamic";

export default async function PageReviser() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const session = await lireSessionDuJour(utilisateur.id, maintenant);

  if (session.questions.length === 0) {
    return (
      <Panneau surface="papier" className="md:py-pas-16">
        <RienAReviser
          totalConcepts={session.totalConcepts}
          conceptsEnAttenteDeQuestions={session.conceptsEnAttenteDeQuestions}
          prochainJourServi={session.prochainJourServi}
          fuseau={session.fuseau}
          maintenant={maintenant}
        />
      </Panneau>
    );
  }

  return (
    <Panneau surface="papier" className="md:py-pas-16">
      <SessionDeRevision questions={session.questions} />
    </Panneau>
  );
}
