import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { FormulaireDepot } from "@/components/depots/formulaire-depot";
import { PlafondAtteint } from "@/components/depots/plafond-atteint";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CONCEPTS_PAR_JOUR,
  DEPOTS_PAR_JOUR,
  estEnListeDattente,
  lireUsageDuJour,
} from "@/lib/db/quota-depots";
import { compterLesDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";
import { quandRepartLeCompteur } from "@/lib/domain/remise-a-zero";

export const metadata: Metadata = { title: "Déposer" };

export default async function PageNouveauDepot() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const [usage, inscrit, depotsFaits] = await Promise.all([
    lireUsageDuJour(utilisateur.id, fuseau),
    estEnListeDattente(utilisateur.id),
    compterLesDepots(utilisateur.id),
  ]);
  // Le premier dépôt d'un compte : c'est le seul moment où les exemples
  // servent, et le seul où l'écran doit dire ce qu'on attend de lui.
  const aucunDepot = depotsFaits === 0;
  // Ce qui reste, c'est ce qu'on peut encore retenir aujourd'hui. Le plafond de
  // dépôts n'est qu'un second rideau : il ne s'annonce pas, il se rencontre.
  const restants = Math.max(0, CONCEPTS_PAR_JOUR - usage.concepts);
  const plein = restants === 0 || usage.depots >= DEPOTS_PAR_JOUR;

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <h1 className="text-h1-app leading-tight font-bold">Dépose ce que tu veux retenir</h1>
        <p className="mt-pas-2 text-petit max-w-xl text-stone-500">
          Le découpage part tout seul. Tu retrouves tes concepts dans la liste, sans rien lancer.
        </p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depot-formulaire" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        {plein ? (
          <PlafondAtteint
            remiseAZero={quandRepartLeCompteur(new Date(), fuseau)}
            inscrit={inscrit}
            plafond={CONCEPTS_PAR_JOUR}
          />
        ) : (
          // La clé d'un geste de dépôt, tirée à chaque affichage : elle rend le
          // double envoi inoffensif sans jamais confondre deux dépôts distincts.
          // L'invite est tirée ici pour la même raison qu'elle ne l'est pas dans
          // le composant : un tirage côté client diverge de celui du serveur.
          <FormulaireDepot
            restants={restants}
            cleEnvoi={crypto.randomUUID()}
            invite={inviteDeDepot(Math.random())}
            premierDepot={aucunDepot}
          />
        )}
      </Panneau>
    </PileDePanneaux>
  );
}
