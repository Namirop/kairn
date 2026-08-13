import type { Metadata } from "next";
import { BlocJournal } from "@/components/administration/bloc-journal";
import { BlocReglages } from "@/components/administration/bloc-reglages";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLeJournal, lireLesReglagesPosés } from "@/lib/db/reglages";

export const metadata: Metadata = { title: "Réglages · Administration" };

/**
 * Le seul écran interne qui écrit quelque chose.
 *
 * Les cinq autres se lisent ; celui-ci se manœuvre — c'est ici qu'on coupe les
 * appels pendant un incident, qu'on baisse un plafond, qu'on change de modèle.
 * Il est en dernier dans la navigation pour cette raison : ce qu'on touche une
 * fois par mois ne se met pas devant ce qu'on regarde tous les jours.
 *
 * `ADMIN_EMAILS` n'y est pas et n'y sera pas : la liste qui décide qui ouvre cet
 * écran ne se modifie pas depuis cet écran.
 */
export const dynamic = "force-dynamic";

export default async function PageReglagesAdmin() {
  await exigerUnAdministrateur();

  const [reglages, journal] = await Promise.all([lireLesReglagesPosés(), lireLeJournal()]);

  // Les valeurs d'environnement voyagent jusqu'au formulaire pour qu'un champ
  // vide veuille dire quelque chose. Aucune n'est un secret : ce sont les six
  // réglages d'exploitation, et rien d'autre ne quitte le serveur.
  const environnement = {
    AI_ENABLED: process.env.AI_ENABLED,
    MOCK_AI: process.env.MOCK_AI,
    AI_DAILY_CALL_CAP: process.env.AI_DAILY_CALL_CAP,
    AI_DAILY_CALL_CAP_PAR_COMPTE: process.env.AI_DAILY_CALL_CAP_PAR_COMPTE,
    AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
    AI_MODEL: process.env.AI_MODEL,
  };

  return (
    <PageAdmin
      titre="Réglages"
      contexte="Ce qui est posé ici s'applique au prochain appel, sans redéploiement. Un champ vide laisse la variable d'environnement décider."
    >
      <BlocReglages poses={reglages} environnement={environnement} />
      <BlocJournal lignes={journal} />
    </PageAdmin>
  );
}
