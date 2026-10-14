// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision.
import type { Metadata } from "next";
import { BlocVolumes } from "@/components/administration/bloc-volumes";
import { Carte, GraphiqueBarres } from "@/components/administration/graphique-barres";
import { nombre } from "@/components/administration/formats";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { JOURS_MONTRES, lireLesVolumes } from "@/lib/db/administration";

export const metadata: Metadata = { title: "Contenu · Administration" };

/**
 * Ce qui est entré dans le produit, et ce que le découpage en a tiré. La
 * moyenne de concepts par dépôt est la mesure clé : elle chute avec les rejets
 * et grimpe avec les articles entiers, ce que les compteurs bruts confondent.
 */
export const dynamic = "force-dynamic";

export default async function PageContenu() {
  await exigerUnAdministrateur();

  const volumes = await lireLesVolumes();
  const depots = [...volumes]
    .reverse()
    .map((ligne) => ({ jour: ligne.jour, valeur: ligne.depots }));

  return (
    <PageAdmin
      titre="Contenu"
      contexte="Dépôts et concepts, par journée UTC. Un jour sans dépôt n'a pas de moyenne — pas une moyenne nulle."
    >
      <Carte
        titre="Dépôts par jour"
        contexte={`${JOURS_MONTRES} derniers jours. La dernière barre est la journée en cours.`}
      >
        <GraphiqueBarres points={depots} format={nombre} intitule="Dépôts par jour" />
      </Carte>

      <BlocVolumes jours={volumes} />
    </PageAdmin>
  );
}
