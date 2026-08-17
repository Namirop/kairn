import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BoutonDeconnexion } from "@/components/compte/bouton-deconnexion";
import { MesDonnees } from "@/components/compte/mes-donnees";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { FormulaireDeReglages } from "@/components/reglages/formulaire-de-reglages";
import { estAdministrateur } from "@/lib/auth/admin";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireReglages } from "@/lib/db/user-settings";

export const metadata: Metadata = { title: "Réglages" };

/**
 * La page est recalculée à chaque visite : les réglages viennent d'être écrits,
 * et une version en cache montrerait l'état d'avant.
 */
export const dynamic = "force-dynamic";

/**
 * Une donnée du compte qu'on ne change pas ici, et pourquoi.
 *
 * Chaque ligne est posée sur sa propre surface plutôt que séparée de la suivante
 * par un filet — c'est la même correction que partout ailleurs, à l'échelle d'une
 * liste de définitions. La raison est écrite à côté : une valeur qu'on ne peut
 * pas toucher sans qu'on dise pourquoi ressemble à une fonctionnalité oubliée.
 */
function Ligne({ intitule, valeur, raison }: { intitule: string; valeur: string; raison: string }) {
  return (
    <div className="px-pas-4 py-pas-3 rounded-champ bg-surface-papier">
      <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
        <dt className="text-corps text-stone-900">{intitule}</dt>
        <dd className="text-petit font-mono text-stone-700 tabular-nums">{valeur}</dd>
      </div>
      <p className="mt-pas-1 text-petit max-w-md text-stone-500">{raison}</p>
    </div>
  );
}

export default async function PageReglages() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const reglages = await lireReglages(utilisateur.id);

  /**
   * L'exploitant n'a pas les mêmes besoins que la personne qui apprend.
   *
   * « Comment ça marche » explique le produit à qui le découvre ; l'export et la
   * suppression de compte sont des droits qu'on exerce contre celui qui détient
   * les données — or ici c'est la même personne, avec un accès direct à la base.
   * Les lui montrer ne lui offre rien qu'il n'ait déjà, et met un bouton qui
   * efface tout à un clic d'un écran qu'il ouvre pour vérifier son fuseau.
   *
   * Rien n'est retiré à personne d'autre : un compte ordinaire garde les trois.
   */
  const administrateur = estAdministrateur(utilisateur.email);

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <h1 className="text-h1-app leading-tight font-bold">Réglages</h1>
        <p className="mt-pas-2 text-petit max-w-md text-stone-500">
          Ce que tu fais dans Kairn, et ce que Kairn fait sans toi.
        </p>
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

        <dl className="gap-pas-2 mt-pas-12 flex flex-col">
          <Ligne
            intitule="Adresse"
            valeur={utilisateur.email}
            raison="C'est l'identité du compte : elle sert à s'y connecter, puisqu'il n'y a pas de mot de passe. La changer demande de vérifier la nouvelle avant de basculer."
          />
          <Ligne
            intitule="Fuseau horaire"
            valeur={reglages.timezone}
            raison="Détecté depuis ton navigateur à chaque visite, et corrigé tout seul si tu changes de pays. Il décide quel jour il est pour toi, et à quelle heure part ton rappel."
          />
        </dl>

        {/* L'accès à l'administration a quitté cette page : il est dans le rail,
            à la place qu'occupaient les réglages. Un raccourci qui existe à deux
            endroits finit par en avoir un des deux qui ment. */}
        {administrateur ? null : (
          <div className="gap-pas-4 mt-pas-8 flex flex-col items-start">
            <Link
              href={ROUTES.commentCaMarche}
              className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              Comment ça marche
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
