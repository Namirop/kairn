import type { Metadata } from "next";
import { BlocComptes } from "@/components/administration/bloc-comptes";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLesComptes } from "@/lib/db/administration";

export const metadata: Metadata = { title: "Comptes · Administration" };

/**
 * Qui a un compte, et qui s'en sert.
 *
 * L'écart entre les deux est le signal le plus précoce du produit : il se creuse
 * des semaines avant que le nombre d'inscriptions cesse de monter.
 */
export const dynamic = "force-dynamic";

export default async function PageComptes() {
  await exigerUnAdministrateur();

  const comptes = await lireLesComptes();

  return (
    <PageAdmin
      titre="Comptes"
      contexte="Les fenêtres sont en UTC. Est actif un compte qui a fait au moins un passage — ouvrir l'écran ne compte pas."
    >
      <BlocComptes chiffres={comptes} />
    </PageAdmin>
  );
}
