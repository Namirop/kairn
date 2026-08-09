import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ColonneCairn } from "@/components/tableau/colonne-cairn";
import { CompteurDu } from "@/components/tableau/compteur-du";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { ListeEnCours } from "@/components/tableau/liste-en-cours";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireTableauDeBord } from "@/lib/db/tableau-de-bord";

export const metadata: Metadata = { title: "Aujourd'hui" };

/**
 * Le tableau de bord. La colonne de gauche porte ce qu'il y a à faire, celle de
 * droite ce qui a été construit — le poids du contenu décide de la découpe, pas
 * un partage à parts égales.
 */
export default async function PageAujourdhui() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const tableau = await lireTableauDeBord(utilisateur.id, maintenant);

  return (
    <div className="gap-pas-12 flex flex-col">
      <div className="gap-pas-8 md:gap-pas-12 flex flex-col-reverse md:grid md:grid-cols-[1.6fr_1fr] md:items-start">
        <CompteurDu nombre={tableau.dusAujourdhui} aDesAtoms={tableau.totalAtoms > 0} />
        <ColonneCairn
          consolides={tableau.stats?.atomsConsolidated ?? 0}
          graines={tableau.grainesDuCairn}
          streak={tableau.stats?.currentStreak ?? 0}
        />
      </div>

      <hr className="border-stone-100" />

      <ListeEnCours atomes={tableau.enCours} maintenant={maintenant} fuseau={tableau.fuseau} />
      <ListeDepots depots={tableau.depots} maintenant={maintenant} fuseau={tableau.fuseau} />
    </div>
  );
}
