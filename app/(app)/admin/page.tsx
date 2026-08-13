import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Bandeau } from "@/components/administration/bandeau";
import { BlocComptes } from "@/components/administration/bloc-comptes";
import { BlocDepense } from "@/components/administration/bloc-depense";
import { BlocJournal } from "@/components/administration/bloc-journal";
import { BlocReglages } from "@/components/administration/bloc-reglages";
import { BlocSignalements } from "@/components/administration/bloc-signalements";
import { BlocVolumes } from "@/components/administration/bloc-volumes";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireLAdministration } from "@/lib/db/administration";
import { lireLeJournal, lireLesReglagesPosés } from "@/lib/db/reglages";
import { listerLesSignalements } from "@/lib/db/signalement";

export const metadata: Metadata = { title: "Administration" };

/**
 * L'écran interne : ce que le produit coûte, ce qu'il sert, ce qu'on lui
 * reproche, et les six réglages qui le pilotent.
 *
 * L'écran est ordonné du plus urgent au plus rare. Le bandeau porte les quatre
 * chiffres qui décident si la journée demande une action ; viennent ensuite les
 * mesures qu'on lit quand l'un d'eux surprend, puis les réglages qu'on touche
 * une fois par mois. Empilées à plat, ces trois choses avaient toutes le même
 * poids et l'écran se lisait de haut en bas sans savoir où s'arrêter.
 *
 * Pas de graphique et pas de filtre. Un graphique demande à être interprété ;
 * ces chiffres-là doivent répondre à une question qu'on se pose déjà — combien
 * ça coûte aujourd'hui, est-ce qu'on approche du plafond, est-ce que les gens
 * reviennent, est-ce que les questions se sont mises à casser.
 *
 * Le registre est l'inverse de celui du produit : pas de police display, pas
 * d'accent, pas d'élément signature — de la densité et des libellés qui se
 * scannent. Le lecteur change, donc le registre change.
 *
 * Un compte non autorisé reçoit un 404 et non un 403 : l'existence de cette page
 * n'a pas à se confirmer à qui n'y a pas droit.
 */
export const dynamic = "force-dynamic";

export default async function PageAdministration() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  const [chiffres, signalements, reglages, journal, config] = await Promise.all([
    lireLAdministration(),
    listerLesSignalements(),
    lireLesReglagesPosés(),
    lireLeJournal(),
    lireLaConfigEffective(),
  ]);

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
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="page" remplit>
        <h1 className="text-h1-app font-bold text-stone-900">Administration</h1>
        <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
          Les fenêtres et les journées sont en UTC, comme les compteurs qu&apos;elles résument.
          Seuls les réglages, en bas, se modifient.
        </p>

        <div className="mt-pas-8">
          <Bandeau
            comptes={chiffres.comptes}
            depense={chiffres.depense}
            signalements={chiffres.signalements}
            plafond={config.dailyCallCap}
          />
        </div>

        <div className="mt-pas-12">
          <BlocDepense chiffres={chiffres.depense} />
          <BlocComptes chiffres={chiffres.comptes} />
          <BlocVolumes jours={chiffres.volumes} />
          <BlocSignalements signalements={signalements} />
          <BlocReglages poses={reglages} environnement={environnement} />
          <BlocJournal lignes={journal} />
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
