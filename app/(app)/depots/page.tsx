import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="gap-pas-8 flex flex-col">
      {/* Même largeur que la liste : sans ça, le bouton part se poser tout seul
          au bord de l'écran, loin de ce sur quoi il agit. */}
      <div className="gap-pas-4 flex max-w-3xl flex-wrap items-end justify-between">
        <div>
          <h1 className="text-h1-app leading-tight font-bold">Ce que tu as déposé</h1>
          <p className="mt-pas-2 text-petit text-stone-500">
            Le texte d&apos;origine n&apos;est jamais réécrit. Il reste tel que tu l&apos;as posé.
          </p>
        </div>
        <Button asChild>
          <Link href={`${ROUTES.depots}/nouveau`}>Déposer</Link>
        </Button>
      </div>

      <ListeDepots
        depots={depots}
        maintenant={maintenant}
        fuseau={fuseau}
        titre={null}
        avecLien={false}
      />
    </div>
  );
}
