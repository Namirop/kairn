import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { RienAReviser } from "@/components/revision/rien-a-reviser";
import { SessionDeRevision } from "@/components/revision/session-de-revision";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { findUserStats, lireReglages } from "@/lib/db/user-settings";
import { prochainRappel } from "@/lib/domain/prochain-rappel";

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
  const [session, reglages, compteurs] = await Promise.all([
    lireSessionDuJour(utilisateur.id, maintenant),
    lireReglages(utilisateur.id),
    findUserStats(utilisateur.id),
  ]);

  // Un rappel coupé n'a pas d'heure à annoncer, et l'annoncer quand même serait
  // promettre un email qui ne partira pas.
  const rappelActif = reglages.dailyReminderEnabled && reglages.emailOptOutAt === null;

  return (
    <SessionDeRevision
      questions={session.questions}
      /*
        L'écran vide est passé en accessoire, il n'est plus décidé ici.

        La page en décidait, et c'est ce qui rendait la fin de session fragile :
        une revalidation la faisait relire, le serveur voyait une session
        désormais vide, et remplaçait l'écran de fin par « tu es à jour » à
        l'instant où l'on venait de le mériter.

        La fin de session n'était que la moitié du problème : la **liste des
        questions** se relisait aussi, plus courte de ce qu'on venait de
        répondre, et le rang tenu par le client désignait alors la question
        d'après. `SessionDeRevision` la gèle maintenant à l'ouverture, et
        l'écran ne craint plus aucune relecture de la route.

        Rendu ici mais servi là-bas, l'écran vide ne coûte rien quand il ne sert
        pas, et l'état « la session est finie » vit dans le client, où un
        rafraîchissement du serveur ne peut pas le contredire.
      */
      vide={
        <PileDePanneaux>
          <Panneau surface="papier" mesure="texte" remplit centre className="md:py-pas-16">
            <RienAReviser
              totalConcepts={session.totalConcepts}
              conceptsEnAttenteDeQuestions={session.conceptsEnAttenteDeQuestions}
              prochainJourServi={session.prochainJourServi}
              reporteAuLendemain={session.reporteAuLendemain}
              fuseau={session.fuseau}
              maintenant={maintenant}
            />
          </Panneau>
        </PileDePanneaux>
      }
      jour={jourDeLaSession(maintenant, session.fuseau)}
      serie={compteurs?.currentStreak ?? 0}
      rappel={
        rappelActif ? prochainRappel(maintenant, reglages.dailyReminderHour, session.fuseau) : null
      }
      expliquerLEspacement={reglages.spacingIntroSeenAt === null}
    />
  );
}

/**
 * Le jour de la session, chez l'utilisateur.
 *
 * Le fuseau est passé explicitement : sans lui, le serveur écrirait sa propre
 * date, et quelqu'un qui révise à 00 h 30 à Sydney verrait la veille.
 */
function jourDeLaSession(maintenant: Date, fuseau: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    day: "numeric",
    month: "long",
    timeZone: fuseau,
  }).format(maintenant);
}
