// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import type { Metadata } from "next";
import { BlocComptes } from "@/components/administration/bloc-comptes";
import { BlocListeDesComptes } from "@/components/administration/bloc-liste-des-comptes";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { lireLesComptes } from "@/lib/db/administration";
import { lireLaListeDesComptes } from "@/lib/db/liste-des-comptes";

export const metadata: Metadata = { title: "Comptes · Administration" };

/** Les chiffres avant les comptes nommés : on vient ici pour la tendance. */
export const dynamic = "force-dynamic";

export default async function PageComptes() {
  await exigerUnAdministrateur();

  const [comptes, inscrits] = await Promise.all([lireLesComptes(), lireLaListeDesComptes()]);

  return (
    <PageAdmin
      titre="Comptes"
      contexte="Les fenêtres sont en UTC. Est actif un compte qui a fait au moins un passage — ouvrir l'écran ne compte pas."
    >
      <BlocComptes chiffres={comptes} />
      <BlocListeDesComptes comptes={inscrits} />
    </PageAdmin>
  );
}
