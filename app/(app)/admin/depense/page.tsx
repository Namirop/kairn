// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import type { Metadata } from "next";
import { BlocDepense } from "@/components/administration/bloc-depense";
import { BlocDepenseParJour } from "@/components/administration/bloc-depense-par-jour";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { JOURS_MONTRES } from "@/lib/db/administration";
import { lireLaDepenseDuJour, lireLaDepenseParJour } from "@/lib/db/administration-depense";

export const metadata: Metadata = { title: "Dépense · Administration" };

/** Par intention (qu'est-ce qui coûte), puis jour par jour (est-ce que ça dérape). */
export const dynamic = "force-dynamic";

export default async function PageDepense() {
  await exigerUnAdministrateur();

  const maintenant = new Date();
  const [jour, jours] = await Promise.all([
    lireLaDepenseDuJour(maintenant),
    lireLaDepenseParJour(maintenant, JOURS_MONTRES),
  ]);

  return (
    <PageAdmin
      titre="Dépense"
      contexte="Lue au registre des appels, en UTC — le calendrier du plafond. Les échecs sont comptés : un appel raté a pu consommer des tokens et a pris sa place au plafond."
    >
      <BlocDepense chiffres={jour} />
      <BlocDepenseParJour jours={jours} />
    </PageAdmin>
  );
}
