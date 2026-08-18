import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { listerDepots } from "@/lib/db/depots";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";

export const metadata: Metadata = { title: "Dépôts" };

export default async function PageDepots() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const [depots, fuseau] = await Promise.all([
    listerDepots(utilisateur.id),
    lireFuseauUtilisateur(utilisateur.id),
  ]);

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        {/* Même largeur que la liste : sans ça, le bouton part se poser tout
            seul au bord de l'écran, loin de ce sur quoi il agit.

            Sur une colonne, le titre se centre et le bouton prend la largeur,
            comme celui d'« Aujourd'hui » — ce sont les deux mêmes gestes
            d'ouverture d'écran, et rien ne justifiait qu'ils ne se ressemblent
            pas. La rangée ne se reforme qu'avec la place de la porter. */}
        <div className="gap-pas-6 md:gap-pas-4 flex flex-col items-center text-center md:flex-row md:flex-wrap md:items-end md:justify-between md:text-left">
          <div>
            <h1 className="text-h1-app leading-tight font-bold">Ce que tu as déposé</h1>
            <p className="mt-pas-2 text-petit mx-auto max-w-md text-stone-500 md:mx-0">
              Le texte d&apos;origine n&apos;est jamais réécrit. Il reste tel que tu l&apos;as posé.
            </p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={`${ROUTES.depots}/nouveau`}>Déposer</Link>
          </Button>
        </div>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depots-liste" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <ListeDepots
          depots={depots}
          maintenant={maintenant}
          fuseau={fuseau}
          titre={null}
          avecLien={false}
          surface="ombre"
        />
      </Panneau>
    </PileDePanneaux>
  );
}
