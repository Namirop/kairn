// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import type { Metadata } from "next";
import { Bandeau } from "@/components/administration/bandeau";
import { ConfigIllisible } from "@/components/administration/config-illisible";
import { Carte, GraphiqueBarres } from "@/components/administration/graphique-barres";
import { dollars, nombre } from "@/components/administration/formats";
import { PageAdmin } from "@/components/administration/page-admin";
import { diagnostiquerLaConfig } from "@/lib/ai/config-diagnostiquee";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { JOURS_MONTRES, lireLAdministration } from "@/lib/db/administration";
import { lireLaDepenseParJour } from "@/lib/db/administration-depense";

export const metadata: Metadata = { title: "Administration" };

/**
 * La synthèse : quatre chiffres et deux courbes ; le détail ligne par ligne
 * vit dans les autres onglets.
 *
 * Les deux séries partagent la même fenêtre de jours, pour se comparer à l'œil
 * sans piège.
 *
 * Une configuration illisible s'énonce ici au lieu de faire tomber l'écran :
 * c'est celui où l'on vient chercher ce qui ne va pas.
 */
export const dynamic = "force-dynamic";

export default async function PageSynthese() {
  await exigerUnAdministrateur();

  const [chiffres, serie, config] = await Promise.all([
    lireLAdministration(),
    lireLaDepenseParJour(new Date(), JOURS_MONTRES),
    diagnostiquerLaConfig(),
  ]);

  // Les lectures rendent le plus récent d'abord, ce qui est l'ordre d'un
  // tableau ; un axe du temps va dans l'autre sens.
  const depense = [...serie]
    .reverse()
    .map((ligne) => ({ jour: ligne.jour, valeur: ligne.coutReel ?? ligne.coutCatalogue }));
  const concepts = [...chiffres.volumes]
    .reverse()
    .map((ligne) => ({ jour: ligne.jour, valeur: ligne.concepts }));

  return (
    <PageAdmin
      titre="Administration"
      contexte="Les fenêtres et les journées sont en UTC, comme les compteurs qu'elles résument. Le détail de chaque mesure est dans son onglet."
    >
      {config.lisible ? null : (
        <div className="mb-pas-6">
          <ConfigIllisible motif={config.motif} />
        </div>
      )}

      <Bandeau
        comptes={chiffres.comptes}
        depense={chiffres.depense}
        signalements={chiffres.signalements}
        plafond={config.lisible ? config.config.dailyCallCap : null}
      />

      <div className="gap-pas-6 mt-pas-12 grid lg:grid-cols-2">
        <Carte
          titre="Dépense par jour"
          contexte={`${JOURS_MONTRES} derniers jours, au tarif réellement facturé. La dernière barre est la journée en cours.`}
        >
          <GraphiqueBarres
            points={depense}
            format={dollars}
            intitule="Dépense par jour, en dollars"
          />
        </Carte>

        <Carte
          titre="Concepts extraits par jour"
          contexte={`${JOURS_MONTRES} derniers jours. C'est ce qui entre vraiment dans le produit, dépôts mis à part.`}
        >
          <GraphiqueBarres
            points={concepts}
            format={nombre}
            intitule="Concepts extraits par jour"
          />
        </Carte>
      </div>
    </PageAdmin>
  );
}
