// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import type { EtatDuPaiement } from "@/lib/paiement/etat-pour-ladministration";

/**
 * En lecture seule : `PAIEMENT_LIVE`, dernier verrou avant d'encaisser, ne se
 * manœuvre pas depuis l'écran qu'il protège. Le catalogue confronte les prix
 * annoncés à Stripe : un écart ferait échouer chaque achat sans autre signe.
 */

const CE_QUE_LE_MODE_VEUT_DIRE = {
  ferme: "Aucune clé posée. L'écran de l'offre le dit et ne propose rien — c'est un état sain.",
  test: "Clé de test. Les achats aboutissent mais rien n'est débité, et rien de ce qui est créé ici n'existe en production.",
  live: "Clé de production. Les achats débitent de vraies cartes.",
} as const;

export function BlocPaiement({ etat }: { etat: EtatDuPaiement }) {
  return (
    <Section
      intitule="Paiement"
      contexte="Cet écran ne change rien au paiement : la bascule vers la production reste une variable d'environnement, posée chez l'hébergeur. Ce qui est ici se lit."
    >
      <dl className="gap-pas-4 flex flex-col">
        <div className="gap-pas-3 flex flex-wrap items-baseline">
          <dt className="text-petit text-stone-500">Mode</dt>
          <dd className="text-petit font-mono font-semibold text-stone-900 uppercase">
            {etat.mode}
          </dd>
          <dd className="text-petit max-w-prose text-stone-500">
            {CE_QUE_LE_MODE_VEUT_DIRE[etat.mode]}
          </dd>
        </div>
      </dl>

      {etat.catalogue.length > 0 ? (
        <div className="mt-pas-6 overflow-x-auto">
          <table className="text-petit w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-left text-stone-500">
                <th className="py-pas-2 pr-pas-4 font-normal">Clé de recherche</th>
                <th className="py-pas-2 pr-pas-4 text-right font-normal">La page annonce</th>
                <th className="py-pas-2 font-normal">Ce que Stripe rend</th>
              </tr>
            </thead>
            <tbody>
              {etat.catalogue.map((ligne) => (
                <tr key={ligne.cle} className="border-b border-stone-300 align-baseline">
                  <td className="py-pas-2 pr-pas-4 font-mono text-stone-900">{ligne.cle}</td>
                  <td className="py-pas-2 pr-pas-4 text-right font-mono text-stone-900 tabular-nums">
                    {ligne.annonce} €
                  </td>
                  <td className="py-pas-2 font-mono">
                    {"prix" in ligne.resolu ? (
                      <span className="text-stone-500">{ligne.resolu.prix}</span>
                    ) : (
                      // Tel quel : mot pour mot ce qui bloquerait une vente.
                      <span className="text-alerte">{ligne.resolu.erreur}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Section>
  );
}
