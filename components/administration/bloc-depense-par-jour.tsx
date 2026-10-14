// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import { dollars, nombre } from "@/components/administration/formats";
import type { LigneDeDepenseParJour } from "@/lib/db/administration-depense";

/**
 * La dépense des derniers jours, en valeurs ; le graphique de la synthèse en
 * donne la forme. La colonne des échecs dit si la dépense monte avec l'usage
 * ou avec les échecs.
 */
export function BlocDepenseParJour({ jours }: { jours: LigneDeDepenseParJour[] }) {
  return (
    <Section
      intitule="Jour par jour"
      contexte="Du plus récent au plus ancien. Le coût réel tient compte des remises en cours ; le catalogue est ce qu'enregistre le registre."
    >
      <div className="overflow-x-auto">
        <table className="text-petit w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-300 text-left text-stone-500">
              <th className="py-pas-2 pr-pas-4 font-normal">Jour</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Appels</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Échecs</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Catalogue</th>
              <th className="py-pas-2 pl-pas-4 text-right font-normal">Réel</th>
            </tr>
          </thead>
          <tbody>
            {jours.map((ligne) => (
              <tr key={ligne.jour} className="border-b border-stone-300 last:border-b-0">
                <td className="py-pas-2 pr-pas-4 font-mono tabular-nums">{ligne.jour}</td>
                <Cellule>{nombre(ligne.appels)}</Cellule>
                <Cellule alerte={ligne.echecs > 0}>{nombre(ligne.echecs)}</Cellule>
                <Cellule>{dollars(ligne.coutCatalogue)}</Cellule>
                <Cellule>{dollars(ligne.coutReel)}</Cellule>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/**
 * Un échec non nul se colore ; la teinte accompagne le chiffre sans le
 * remplacer, pour qui ne la distingue pas.
 */
function Cellule({ children, alerte = false }: { children: string; alerte?: boolean }) {
  return (
    <td
      className={
        alerte
          ? "py-pas-2 pl-pas-4 text-alerte text-right font-mono tabular-nums"
          : "py-pas-2 pl-pas-4 text-right font-mono tabular-nums"
      }
    >
      {children}
    </td>
  );
}
