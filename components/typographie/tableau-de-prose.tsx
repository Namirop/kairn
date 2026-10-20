import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * En fiches sous `sm` : trois colonnes de prose ne tiennent pas dans 320 points.
 * Les `role` sont posés à la main : `display: block` efface la sémantique du
 * tableau, le lecteur d'écran n'y lirait que du texte à la suite.
 */

const LIBELLE = "text-mono font-mono tracking-[0.14em] text-stone-500 uppercase";
const CELLULE =
  "mb-pas-2 sm:mb-0 sm:py-pas-2 sm:pr-pas-3 block sm:table-cell align-top last:mb-0 sm:last:pr-0";

export function TableauDeProse({ entetes, lignes }: { entetes: string[]; lignes: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table role="table" className="block w-full border-collapse text-left tabular-nums sm:table">
        {entetes.length > 0 ? (
          <thead role="rowgroup" className="hidden sm:table-header-group">
            <tr role="row">
              {entetes.map((entete, rang) => (
                <th
                  key={rang}
                  role="columnheader"
                  scope="col"
                  className={`${CELLULE} ${LIBELLE} pt-0 font-normal`}
                >
                  <TexteTechnique>{entete}</TexteTechnique>
                </th>
              ))}
            </tr>
          </thead>
        ) : null}

        <tbody role="rowgroup" className="block sm:table-row-group">
          {lignes.map((ligne, rang) => (
            <tr
              key={rang}
              role="row"
              className="py-pas-3 block border-t border-stone-300 first:border-t-0 sm:table-row sm:border-t sm:py-0"
            >
              {ligne.map((cellule, colonne) => (
                <td
                  key={colonne}
                  role="cell"
                  className={`${CELLULE} ${colonne === 0 ? "font-medium text-stone-900" : ""}`}
                >
                  {entetes[colonne] ? (
                    <span className={`${LIBELLE} mb-pas-1 block font-normal sm:hidden`}>
                      <TexteTechnique>{entetes[colonne]}</TexteTechnique>
                    </span>
                  ) : null}
                  <TexteTechnique>{cellule}</TexteTechnique>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
