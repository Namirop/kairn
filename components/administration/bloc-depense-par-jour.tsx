// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import { dollars, nombre } from "@/components/administration/formats";
import type { LigneDeDepenseParJour } from "@/lib/db/administration-depense";

/**
 * La dépense des derniers jours, ligne à ligne.
 *
 * Le graphique de la synthèse donne la forme ; celui-ci donne les valeurs, et
 * les deux ne servent pas au même moment. On regarde la forme pour repérer le
 * jour anormal, on vient ici pour savoir ce qu'il valait exactement et combien
 * d'appels il a fallu pour l'atteindre.
 *
 * La colonne des échecs est la plus utile du tableau une fois qu'on est là :
 * une dépense qui monte avec les échecs n'est pas une dépense qui monte avec
 * l'usage, et c'est la seule distinction qui change ce qu'on doit faire.
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
 * Un échec non nul se colore, un échec à zéro reste de l'encre ordinaire.
 *
 * C'est une couleur sémantique et non une couleur de série : elle dit un état,
 * et elle ne sert qu'à ça sur cet écran. Elle ne remplace pas le chiffre, elle
 * l'accompagne — la valeur reste lisible pour qui ne distingue pas la teinte.
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
