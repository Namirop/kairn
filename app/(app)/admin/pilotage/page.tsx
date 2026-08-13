import type { Metadata } from "next";
import { BlocJournal } from "@/components/administration/bloc-journal";
import { BlocReglages } from "@/components/administration/bloc-reglages";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLeJournal, lireLesReglagesPosés } from "@/lib/db/reglages";

export const metadata: Metadata = { title: "Pilotage · Administration" };

/**
 * Le seul écran interne qui écrit quelque chose.
 *
 * Les cinq autres se lisent ; celui-ci se manœuvre — c'est ici qu'on coupe les
 * appels pendant un incident, qu'on baisse un plafond, qu'on change de modèle.
 * Il est en fin de navigation pour cette raison : ce qu'on touche une fois par
 * mois ne se met pas devant ce qu'on regarde tous les jours.
 *
 * Ce sont les réglages **du modèle**. Ceux du compte — fuseau, heure de rappel,
 * export, suppression — vivent dans le produit, et le rail interne y renvoie
 * sous « Mon compte » : deux entrées appelées « Réglages » dans la même
 * navigation ne se distingueraient pas.
 *
 * `ADMIN_EMAILS` n'y est pas et n'y sera pas : la liste qui décide qui ouvre cet
 * écran ne se modifie pas depuis cet écran.
 */
export const dynamic = "force-dynamic";

export default async function PagePilotage() {
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
      titre="Pilotage"
      contexte="Les réglages du modèle. Ce qui est posé ici s'applique au prochain appel, sans redéploiement ; un champ vide laisse la variable d'environnement décider."
    >
      <BlocReglages poses={reglages} environnement={environnement} />
      <BlocJournal lignes={journal} />
    </PageAdmin>
  );
}
