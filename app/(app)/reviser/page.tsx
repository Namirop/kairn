import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { RienAReviser } from "@/components/revision/rien-a-reviser";
import { SessionDeRevision } from "@/components/revision/session-de-revision";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { trouverLesCompteurs, lireReglages } from "@/lib/db/reglages-du-compte";
import { prochainRappel } from "@/lib/domain/prochain-rappel";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("revision.pages");

  return { title: t("reviser") };
}

/**
 * La session du jour. Recalculée à chaque visite : ce qui est dû dépend de
 * l'heure chez l'utilisateur, et une session en cache serait d'un autre moment.
 */
export const dynamic = "force-dynamic";

export default async function PageReviser() {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const [session, reglages, compteurs] = await Promise.all([
    lireSessionDuJour(utilisateur.id, maintenant),
    lireReglages(utilisateur.id),
    trouverLesCompteurs(utilisateur.id),
  ]);

  // Sans rappel actif, annoncer une heure promettrait un email qui ne part pas.
  const rappelActif = reglages.dailyReminderEnabled && reglages.emailOptOutAt === null;

  return (
    <SessionDeRevision
      questions={session.questions}
      /*
        L'écran vide est passé en accessoire, et c'est `SessionDeRevision` qui
        décide de l'afficher. Si la page en décidait, la revalidation de fin de
        session relirait une session vide et remplacerait l'écran de fin par
        « tu es à jour ». L'état « session finie » vit dans le client, où un
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
      jour={jourDeLaSession(maintenant, session.fuseau, ETIQUETTE_INTL[await langueDeLaRequete()])}
      serie={compteurs?.currentStreak ?? 0}
      rappel={
        rappelActif ? prochainRappel(maintenant, reglages.dailyReminderHour, session.fuseau) : null
      }
      expliquerLEspacement={reglages.spacingIntroSeenAt === null}
    />
  );
}

/**
 * Le jour de la session, chez l'utilisateur : sans fuseau explicite, le serveur
 * écrirait sa propre date, et 00 h 30 à Sydney afficherait la veille.
 */
function jourDeLaSession(maintenant: Date, fuseau: string, etiquette: string): string {
  return new Intl.DateTimeFormat(etiquette, {
    day: "numeric",
    month: "long",
    timeZone: fuseau,
  }).format(maintenant);
}
