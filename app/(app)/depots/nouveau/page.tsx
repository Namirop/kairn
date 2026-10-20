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
    lireLOffreDuCompte(utilisateur.id),
  ]);
  const aucunDepot = depotsFaits === 0;
  // Seuls les concepts s'annoncent ; le plafond de dépôts se rencontre.
  const restants = Math.max(0, offre.plafond - usage.concepts);
  // Suit le plan, sinon une offre payée s'arrêterait avant son plafond de concepts.
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
  // Les deux pleins : on nomme les concepts, la limite qui se paie.
  const motif = restants === 0 ? "concepts" : "depots";
  // Voulu : un Server Component se rend une fois par requête, la règle de pureté
  // vise les composants client.
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
            // Seulement si elle ouvre quelque chose : elle ne lève pas le plafond
            // de dépôts.
            offreAProposer={offre.plan === "GRATUIT" && motif === "concepts" && paiementOuvert()}
          />
        ) : (
          // La clé rend le double envoi inoffensif sans confondre deux dépôts.
          // L'invite est tirée ici : côté client, le tirage divergerait du serveur.
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
