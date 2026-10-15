import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { FormulaireDepot } from "@/components/depots/formulaire-depot";
import { PlafondAtteint } from "@/components/depots/plafond-atteint";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireLOffreDuCompte } from "@/lib/db/abonnement";
import { estEnListeDattente } from "@/lib/db/liste-dattente";
import { lireUsageDeLaPeriode } from "@/lib/db/periode-du-compte";
import { compterLesDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";
import { plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { paiementOuvert } from "@/lib/paiement/config";
import { jourLocal } from "@/lib/domain/jour-local";
import { quandRepartLeCompteur } from "@/lib/domain/remise-a-zero";
import { parametresDeRemise } from "@/lib/i18n/dire-le-temps";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("depots.formulaire");

  return { title: t("metaTitre") };
}

export default async function PageNouveauDepot({
  searchParams,
}: {
  /** `partage=absent` : un partage du système est arrivé et n'a pas pu être retenu. */
  searchParams: Promise<{ partage?: string }>;
}) {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const { partage } = await searchParams;
  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const [usage, inscrit, depotsFaits, offre] = await Promise.all([
    lireUsageDeLaPeriode(utilisateur.id, fuseau),
    estEnListeDattente(utilisateur.id),
    compterLesDepots(utilisateur.id),
    // L'offre entière : l'écran dit pourquoi la période est pleine, selon le plan.
    lireLOffreDuCompte(utilisateur.id),
  ]);
  // Au premier dépôt seulement, l'écran montre des exemples.
  const aucunDepot = depotsFaits === 0;
  // On annonce les concepts restants ; le plafond de dépôts est un second
  // rideau qui ne s'annonce pas, il se rencontre.
  const restants = Math.max(0, offre.plafond - usage.concepts);
  // Le rideau des dépôts suit le plan, sinon une offre payée s'arrêterait bien
  // avant son plafond de concepts.
  const depotsMax = plafondDeDepots(offre.plafond);
  const depotsPleins = usage.depots >= depotsMax;
  const t = await getTranslations("depots.formulaire");
  const tTemps = await getTranslations("temps");
  const remiseAZero = tTemps(
    "remiseAZero",
    parametresDeRemise(
      quandRepartLeCompteur(jourLocal(new Date(), fuseau), usage.periode.fin),
      ETIQUETTE_INTL[await langueDeLaRequete()],
    ),
  );
  const plein = restants === 0 || depotsPleins;
  // Quand les deux ferment ensemble, on nomme les concepts : c'est la limite
  // qui se paie.
  const motif = restants === 0 ? "concepts" : "depots";
  // L'invite change à chaque visite, et c'est voulu. Un Server Component se rend
  // une fois par requête : la règle de pureté, qui ne le distingue pas d'un
  // composant client, ne s'applique pas ici.
  // eslint-disable-next-line react-hooks/purity
  const invite = inviteDeDepot(Math.random(), await langueDeLaRequete());

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <h1 className="text-h1-app leading-tight font-bold">{t("titre")}</h1>
        <p className="mt-pas-2 text-petit max-w-xl text-stone-500">{t("chapeau")}</p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depot-formulaire" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        {plein ? (
          <PlafondAtteint
            remiseAZero={remiseAZero}
            inscrit={inscrit}
            motif={motif}
            limite={motif === "concepts" ? offre.plafond : depotsMax}
            // L'offre ne se propose que si elle ouvre quelque chose : pas à qui
            // paie déjà, pas contre le rideau des dépôts qu'elle ne lève pas, pas
            // sans clés de paiement.
            offreAProposer={offre.plan === "GRATUIT" && motif === "concepts" && paiementOuvert()}
          />
        ) : (
          // La clé d'envoi, tirée à chaque affichage, rend le double envoi
          // inoffensif sans confondre deux dépôts. L'invite est tirée ici et non
          // dans le composant : un tirage côté client divergerait du serveur.
          <FormulaireDepot
            restants={restants}
            cleEnvoi={crypto.randomUUID()}
            invite={invite}
            premierDepot={aucunDepot}
            partageManque={partage === "absent"}
          />
        )}
      </Panneau>
    </PileDePanneaux>
  );
}
