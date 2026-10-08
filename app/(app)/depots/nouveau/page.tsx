import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { FormulaireDepot } from "@/components/depots/formulaire-depot";
import { PlafondAtteint } from "@/components/depots/plafond-atteint";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireLOffreDuCompte } from "@/lib/db/abonnement";
import { estEnListeDattente } from "@/lib/db/liste-dattente";
import { lireUsageDeLaPeriode } from "@/lib/db/periode-du-compte";
import { compterLesDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";
import { plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { paiementOuvert } from "@/lib/paiement/config";
import { localDay } from "@/lib/domain/local-day";
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
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const { partage } = await searchParams;
  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const [usage, inscrit, depotsFaits, offre] = await Promise.all([
    lireUsageDeLaPeriode(utilisateur.id, fuseau),
    estEnListeDattente(utilisateur.id),
    compterLesDepots(utilisateur.id),
    // L'offre entière et non le seul plafond : cet écran doit dire *pourquoi*
    // la période est pleine, et ce qui y répond selon le plan.
    lireLOffreDuCompte(utilisateur.id),
  ]);
  // Le premier dépôt d'un compte : c'est le seul moment où les exemples
  // servent, et le seul où l'écran doit dire ce qu'on attend de lui.
  const aucunDepot = depotsFaits === 0;
  // Ce qui reste, c'est ce qu'on peut encore retenir sur la période. Le plafond
  // de dépôts n'est qu'un second rideau : il ne s'annonce pas, il se rencontre.
  const restants = Math.max(0, offre.plafond - usage.concepts);
  // Le rideau des dépôts suit le plan, comme celui des concepts : sans quoi
  // une offre payée s'arrêterait au soixantième dépôt.
  const depotsMax = plafondDeDepots(offre.plafond);
  const depotsPleins = usage.depots >= depotsMax;
  const t = await getTranslations("depots.formulaire");
  const tTemps = await getTranslations("temps");
  const remiseAZero = tTemps(
    "remiseAZero",
    parametresDeRemise(
      quandRepartLeCompteur(localDay(new Date(), fuseau), usage.periode.fin),
      ETIQUETTE_INTL[await langueDeLaRequete()],
    ),
  );
  const plein = restants === 0 || depotsPleins;
  // Les concepts d'abord : quand les deux ferment le même jour, c'est celle qui
  // se paie qu'il faut nommer.
  const motif = restants === 0 ? "concepts" : "depots";

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
            // L'offre ne se propose qu'à qui elle ouvrirait quelque chose : pas à
            // un compte qui paie déjà, pas contre le rideau des dépôts qu'elle ne
            // lève pas, et pas quand les clés manquent — le bouton mènerait alors
            // à un écran qui dit que le paiement n'est pas ouvert.
            offreAProposer={offre.plan === "GRATUIT" && motif === "concepts" && paiementOuvert()}
          />
        ) : (
          // La clé d'un geste de dépôt, tirée à chaque affichage : elle rend le
          // double envoi inoffensif sans jamais confondre deux dépôts distincts.
          // L'invite est tirée ici pour la même raison qu'elle ne l'est pas dans
          // le composant : un tirage côté client diverge de celui du serveur.
          <FormulaireDepot
            restants={restants}
            cleEnvoi={crypto.randomUUID()}
            invite={inviteDeDepot(Math.random(), await langueDeLaRequete())}
            premierDepot={aucunDepot}
            partageManque={partage === "absent"}
          />
        )}
      </Panneau>
    </PileDePanneaux>
  );
}
