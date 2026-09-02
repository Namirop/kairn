import { Section } from "@/components/administration/section";
import type { EtatDuPaiement } from "@/lib/paiement/etat-pour-ladministration";

/**
 * Où en est le paiement — en lecture seule, et c'est le sujet.
 *
 * Le reste de cet écran se manœuvre : on y coupe les appels, on y baisse un
 * plafond. Ce bloc-là ne fait que dire, parce que `PAIEMENT_LIVE` est le dernier
 * verrou avant d'encaisser du vrai argent et qu'un verrou ne se pose pas derrière
 * le bouton qu'il protège. C'est la règle déjà écrite pour `ADMIN_EMAILS`.
 *
 * Ce qu'on vient y chercher tient en deux questions : dans quel monde suis-je,
 * et le catalogue répond-il ? La seconde décide de tout — un prix dont la clé ou
 * le montant divergent de la page fait échouer chaque achat au clic, et rien
 * d'autre ne le dirait avant le premier client.
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
                      // Le message de refus, tel quel : c'est mot pour mot ce
                      // qui empêcherait une vente d'aboutir.
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
