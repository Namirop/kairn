import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormulaireDepot } from "@/components/depots/formulaire-depot";
import { PlafondAtteint } from "@/components/depots/plafond-atteint";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { compterDepotsDuJour, DEPOTS_PAR_JOUR, estEnListeDattente } from "@/lib/db/quota-depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { quandRepartLeCompteur } from "@/lib/domain/remise-a-zero";

export const metadata: Metadata = { title: "Déposer" };

export default async function PageNouveauDepot() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const [deposes, inscrit] = await Promise.all([
    compterDepotsDuJour(utilisateur.id, fuseau),
    estEnListeDattente(utilisateur.id),
  ]);
  const restants = Math.max(0, DEPOTS_PAR_JOUR - deposes);

  return (
    <div className="gap-pas-8 flex flex-col">
      <div>
        <h1 className="text-h1-app leading-tight font-bold">Dépose ce que tu veux retenir</h1>
        <p className="mt-pas-2 text-petit max-w-xl text-stone-500">
          Le découpage part tout seul. Tu retrouves tes concepts dans la liste, sans rien lancer.
        </p>
      </div>

      {restants === 0 ? (
        <PlafondAtteint remiseAZero={quandRepartLeCompteur(new Date(), fuseau)} inscrit={inscrit} />
      ) : (
        <FormulaireDepot restants={restants} />
      )}
    </div>
  );
}
