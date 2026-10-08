// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import { moyenne, nombre } from "@/components/administration/formats";
import type { LigneDeJour } from "@/lib/db/administration";

/**
 * Ce qui est entré dans le produit, jour par jour.
 *
 * La moyenne de concepts par dépôt est la mesure la plus utile des trois : c'est
 * elle qui dit si le découpage rend ce qu'il devrait. Elle s'effondre quand les
 * dépôts partent en rejet, et elle grimpe quand les gens collent des articles
 * entiers — deux usages très différents que les compteurs bruts confondent.
 *
 * Les jours sans dépôt affichent un tiret et non un zéro : zéro concept sur zéro
 * dépôt n'est pas une moyenne nulle, c'est une moyenne qui n'existe pas.
 */
export function BlocVolumes({ jours }: { jours: LigneDeJour[] }) {
  return (
    <Section
      intitule="Dépôts et concepts"
      contexte="Quatorze derniers jours UTC, du plus récent au plus ancien."
    >
      <div className="overflow-x-auto">
        <table className="text-petit w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-300 text-left text-stone-500">
              <th className="py-pas-2 pr-pas-4 font-normal">Jour</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Dépôts</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Concepts</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Concepts par dépôt</th>
            </tr>
          </thead>
          <tbody>
            {jours.map((ligne) => (
              <tr key={ligne.jour} className="border-b border-stone-300 last:border-b-0">
                <td className="py-pas-2 pr-pas-4 font-mono tabular-nums">{ligne.jour}</td>
                <td className="py-pas-2 pl-pas-4 text-right font-mono tabular-nums">
                  {nombre(ligne.depots)}
                </td>
                <td className="py-pas-2 pl-pas-4 text-right font-mono tabular-nums">
                  {nombre(ligne.concepts)}
                </td>
                <td className="py-pas-2 pl-pas-4 text-right font-mono tabular-nums">
                  {moyenne(ligne.moyenne)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
