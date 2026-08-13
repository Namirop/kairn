import type { Metadata } from "next";
import { BlocDepense } from "@/components/administration/bloc-depense";
import { BlocDepenseParJour } from "@/components/administration/bloc-depense-par-jour";
import { PageAdmin } from "@/components/administration/page-admin";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { JOURS_MONTRES } from "@/lib/db/administration";
import { lireLaDepenseDuJour, lireLaDepenseParJour } from "@/lib/db/administration-depense";

export const metadata: Metadata = { title: "Dépense · Administration" };

/**
 * Ce que le modèle a coûté : la journée par intention, puis les jours par jour.
 *
 * Les deux mailles sont là parce qu'elles répondent à deux questions
 * différentes. « Qu'est-ce qui coûte » se lit par intention ; « est-ce que ça
 * dérape » se lit dans le temps. Un seul des deux tableaux laisserait toujours
 * l'autre question sans réponse.
 */
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
