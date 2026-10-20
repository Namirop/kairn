// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision.
import type { Metadata } from "next";
import { BlocJournal } from "@/components/administration/bloc-journal";
import { BlocPaiement } from "@/components/administration/bloc-paiement";
import { BlocReglages } from "@/components/administration/bloc-reglages";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLeJournal, lireLesReglagesPosés } from "@/lib/db/reglages";
import { lireLEtatDuPaiement } from "@/lib/paiement/etat-pour-ladministration";

export const metadata: Metadata = { title: "Pilotage · Administration" };

/**
 * Le seul écran interne qui écrit. `ADMIN_EMAILS` n'y figure pas : la liste qui
 * décide qui ouvre cet écran ne se modifie pas depuis lui.
 */
export const dynamic = "force-dynamic";

export default async function PagePilotage() {
  await exigerUnAdministrateur();

  const [reglages, journal, paiement] = await Promise.all([
    lireLesReglagesPosés(),
    lireLeJournal(),
    // En lecture seule : `PAIEMENT_LIVE` se change chez l'hébergeur.
    lireLEtatDuPaiement(),
  ]);

  // Pour qu'un champ vide dise ce qui s'appliquera. Part au client : aucun secret.
  const environnement = {
    AI_ENABLED: process.env.AI_ENABLED,
    MOCK_AI: process.env.MOCK_AI,
    AI_DAILY_CALL_CAP: process.env.AI_DAILY_CALL_CAP,
    AI_DAILY_CALL_CAP_PAR_COMPTE: process.env.AI_DAILY_CALL_CAP_PAR_COMPTE,
    AI_DAILY_CALL_CAP_ANONYME: process.env.AI_DAILY_CALL_CAP_ANONYME,
    AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
    AI_MODEL: process.env.AI_MODEL,
  };

  return (
    <PageAdmin
      titre="Pilotage"
      contexte="Les réglages du modèle. Ce qui est posé ici s'applique au prochain appel, sans redéploiement ; un champ vide laisse la variable d'environnement décider."
    >
      <BlocReglages poses={reglages} environnement={environnement} />
      <BlocPaiement etat={paiement} />
      <BlocJournal lignes={journal} />
    </PageAdmin>
  );
}
