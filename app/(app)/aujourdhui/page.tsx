import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { ColonneCairn } from "@/components/tableau/colonne-cairn";
import { CompteurDu } from "@/components/tableau/compteur-du";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireTableauDeBord } from "@/lib/db/tableau-de-bord";

export const metadata: Metadata = { title: "Aujourd'hui" };

/**
 * Le tableau de bord, en trois panneaux.
 *
 * Ce qu'il y a à faire sur le papier, ce qui a été construit sur la roche, ce
 * qu'on a déposé sur l'ombre. C'est le seul écran de l'application qui porte un
 * panneau sombre : l'empilement de pierres y prend la place d'un objet, au lieu
 * de tenir une colonne pendant que la moitié de l'écran reste blanche.
 */
export default async function PageAujourdhui() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const tableau = await lireTableauDeBord(utilisateur.id, maintenant);

  return (
    <>
      <Panneau surface="papier" className="md:py-pas-16">
        <CompteurDu nombre={tableau.dusAujourdhui} aDesAtoms={tableau.totalAtoms > 0} />
      </Panneau>

      <Strates de="papier" vers="roche" graine="aujourdhui-cairn" />

      <Panneau
        surface="roche"
        className="md:py-pas-16 gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_auto] md:items-center"
      >
        <div className="max-w-md">
          <h2 className="text-mono font-mono tracking-[0.14em] text-stone-300 uppercase">
            Ton cairn
          </h2>
          <p className="mt-pas-4 text-corps leading-relaxed">
            Une pierre par concept consolidé. Un concept l&apos;est quand il revient de loin et que
            tu le retrouves trois fois de suite — pas quand tu l&apos;as lu.
          </p>
          <p className="mt-pas-4 text-petit text-stone-300">
            La forme de chaque pierre est tirée du concept qu&apos;elle représente. Personne
            n&apos;empile les mêmes.
          </p>
        </div>

        <ColonneCairn
          consolides={tableau.stats?.atomsConsolidated ?? 0}
          graines={tableau.grainesDuCairn}
          streak={tableau.stats?.currentStreak ?? 0}
        />
      </Panneau>

      <Strates de="roche" vers="ombre" graine="aujourdhui-depots" />

      <Panneau surface="ombre" className="md:pb-pas-16">
        <ListeDepots depots={tableau.depots} maintenant={maintenant} fuseau={tableau.fuseau} />
      </Panneau>
    </>
  );
}
