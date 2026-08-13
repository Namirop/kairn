import type { Metadata } from "next";
import { Bandeau } from "@/components/administration/bandeau";
import { Carte, GraphiqueBarres } from "@/components/administration/graphique-barres";
import { dollars, nombre } from "@/components/administration/formats";
import { PageAdmin } from "@/components/administration/page-admin";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { exigerUnAdministrateur } from "@/lib/auth/garde-admin";
import { JOURS_MONTRES, lireLAdministration } from "@/lib/db/administration";
import { lireLaDepenseParJour } from "@/lib/db/administration-depense";

export const metadata: Metadata = { title: "Administration" };

/**
 * La synthèse : quatre chiffres et deux courbes, et rien d'autre.
 *
 * C'est l'écran qu'on ouvre sans question précise. Il doit donc répondre à
 * celles qu'on ne s'est pas encore formulées — est-ce que ça coûte plus que
 * d'habitude, est-ce qu'il entre encore quelque chose — et renvoyer au détail
 * pour le reste. Tout ce qui demande à être lu ligne par ligne vit dans les
 * cinq autres onglets.
 *
 * Les deux séries partagent la même fenêtre de jours. Deux longueurs
 * différentes posées côte à côte se comparent à l'œil sans qu'on remarque
 * qu'elles ne recouvrent pas la même chose.
 */
export const dynamic = "force-dynamic";

export default async function PageSynthese() {
  await exigerUnAdministrateur();

  const [chiffres, serie, config] = await Promise.all([
    lireLAdministration(),
    lireLaDepenseParJour(new Date(), JOURS_MONTRES),
    lireLaConfigEffective(),
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
      <Bandeau
        comptes={chiffres.comptes}
        depense={chiffres.depense}
        signalements={chiffres.signalements}
        plafond={config.dailyCallCap}
      />

      <div className="gap-pas-6 mt-pas-12 grid lg:grid-cols-2">
        <Carte
          titre="Dépense par jour"
          contexte={`${JOURS_MONTRES} derniers jours, au tarif réellement facturé. La dernière barre est la journée en cours.`}
        >
          <GraphiqueBarres points={depense} format={dollars} intitule="Dépense par jour, en dollars" />
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
