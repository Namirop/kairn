import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BoutonDeconnexion } from "@/components/compte/bouton-deconnexion";
import { MesDonnees } from "@/components/compte/mes-donnees";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ChoixDeLaLangue } from "@/components/reglages/choix-de-la-langue";
import { FormulaireDeReglages } from "@/components/reglages/formulaire-de-reglages";
import { TonOffre } from "@/components/reglages/ton-offre";
import { UnRetour } from "@/components/reglages/un-retour";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireLOffreDuCompte } from "@/lib/db/abonnement";
import { lireReglages } from "@/lib/db/reglages-du-compte";
import { termeLisible } from "@/lib/domain/terme-lisible";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";
import { PARAMETRE_DE_RETOUR, RETOUR_ACCEPTE } from "@/lib/paiement/achat";
import { lireDossierStripe } from "@/lib/db/ecriture-de-labonnement";
import { paiementOuvert } from "@/lib/paiement/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compte.reglages");

  return { title: t("metaTitre") };
}

/**
 * La page est recalculée à chaque visite : les réglages viennent d'être écrits,
 * et une version en cache montrerait l'état d'avant.
 */
export const dynamic = "force-dynamic";

/** Les intitulés de groupe de cette page, comme dans le formulaire de réglages. */
const GROUPE = "text-mono font-mono tracking-[0.14em] text-stone-500 uppercase";

/**
 * Une donnée du compte qu'on ne change pas ici, et pourquoi : une valeur
 * intouchable sans raison écrite ressemble à une fonctionnalité oubliée.
 */
function Ligne({ intitule, valeur, raison }: { intitule: string; valeur: string; raison: string }) {
  return (
    <div className="px-pas-4 py-pas-3 rounded-champ bg-surface-papier">
      <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
        <dt className="text-corps text-stone-900">{intitule}</dt>
        <dd className="text-petit font-mono text-stone-700 tabular-nums">{valeur}</dd>
      </div>
      <p className="mt-pas-1 text-petit text-stone-500">{raison}</p>
    </div>
  );
}

/** Ce que porte l'adresse au retour de Stripe. Rien d'autre n'est lu ici. */
type Parametres = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PageReglages({ searchParams }: Parametres) {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const [reglages, offre, dossier, parametres] = await Promise.all([
    lireReglages(utilisateur.id),
    lireLOffreDuCompte(utilisateur.id),
    // Un dossier chez Stripe, même sans abonnement en cours : c'est ce qui dit
    // s'il y a des factures et une carte à aller voir.
    lireDossierStripe(utilisateur.id),
    searchParams,
  ]);

  /**
   * L'exploitant ne voit ni « Comment ça marche », ni l'export, ni la
   * suppression : il détient déjà les données, et ce bouton qui efface tout
   * n'a rien à faire sur l'écran qu'il ouvre pour vérifier son fuseau.
   */
  const administrateur = estAdministrateur(utilisateur.email);
  const t = await getTranslations("compte.reglages");

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <h1 className="text-h1-app leading-tight font-bold">{t("titre")}</h1>
        <p className="mt-pas-2 text-petit text-stone-500">{t("chapo")}</p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="reglages-liste" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <FormulaireDeReglages
          plafond={reglages.sessionCap}
          rappelActif={reglages.dailyReminderEnabled}
          heureDuRappel={reglages.dailyReminderHour}
          alerteActive={reglages.streakAlertEnabled}
          emailsActifs={reglages.emailOptOutAt === null}
        />

        <div className="mt-pas-2">
          <ChoixDeLaLangue langue={reglages.langue} />
        </div>

        <dl className="gap-pas-2 mt-pas-12 flex flex-col">
          <Ligne
            intitule={t("adresse.intitule")}
            valeur={utilisateur.email}
            raison={t("adresse.raison")}
          />
          <Ligne
            intitule={t("fuseau.intitule")}
            valeur={reglages.timezone}
            raison={t("fuseau.raison")}
          />
        </dl>

        {/* Le geste d'achat est ici et pas sur la page de tarifs : là-bas on
            décide, ici on paie. */}
        <TonOffre
          plan={offre.plan}
          plafond={offre.plafond}
          terme={
            offre.finDePeriode
              ? termeLisible(
                  offre.finDePeriode,
                  reglages.timezone,
                  ETIQUETTE_INTL[await langueDeLaRequete()],
                )
              : null
          }
          resilieALaFin={offre.resilieALaFin}
          ouvert={paiementOuvert()}
          retourDePaiement={parametres[PARAMETRE_DE_RETOUR] === RETOUR_ACCEPTE}
          dossier={dossier.clientId !== null}
        />

        {/* Le seul endroit où signaler autre chose qu'une question. Ici et pas
            dans la navigation : c'est une porte de service, trouvable sans
            occuper le devant. */}
        <section className="mt-pas-12">
          <h2 className={GROUPE}>{t("probleme.titre")}</h2>

          <div className="p-pas-4 md:p-pas-6 rounded-champ bg-surface-papier mt-pas-3">
            <p className="text-petit text-stone-500">{t("probleme.texte")}</p>

            <div className="mt-pas-6">
              <UnRetour />
            </div>
          </div>
        </section>

        {/* Pas de lien vers l'administration : il est dans le rail, et un
            raccourci en double finit par mentir. */}
        {administrateur ? null : (
          <div className="gap-pas-4 mt-pas-8 flex flex-col items-start">
            <Link
              href={ROUTES.commentCaMarche}
              className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              {t("commentCaMarche")}
            </Link>
          </div>
        )}

        <div className="mt-pas-8">
          <BoutonDeconnexion />
        </div>

        {administrateur ? null : <MesDonnees />}
      </Panneau>
    </PileDePanneaux>
  );
}
