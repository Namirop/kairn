import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * Le tableau d'un texte déposé, en tableau sur un écran large et en fiches sur
 * un téléphone.
 *
 * **Trois colonnes de prose ne tiennent pas dans trois cent vingt points, et
 * aucune ruse de largeur ne les y fait tenir.** Mesuré : la colonne qui porte un
 * chemin de fichier — insécable dans son jeton — prend la moitié de la place, la
 * troisième sort du cadre, et chaque cellule s'enroule sur quatre lignes. On lit
 * alors un tiers du tableau à la fois, en le poussant du doigt. Le défilement
 * horizontal n'était pas la réponse, c'était le constat d'échec.
 *
 * En dessous de `sm`, chaque rangée devient donc un petit bloc : le titre de
 * colonne au-dessus de sa valeur, dans le libellé technique du produit, et un
 * filet entre les rangées. C'est la même information, lue dans le sens de
 * l'écran — pas une version amputée.
 *
 * **Les rôles sont posés à la main parce que `display: block` les efface.**
 * Basculer un tableau en blocs lui retire sa sémantique : un lecteur d'écran n'y
 * voit plus des rangées et des cellules mais du texte à la suite. `role` les
 * rend, et la grille reste une grille pour qui ne la voit pas.
 *
 * Pas de rayures, pas de cadre : un filet entre les rangées, et la première
 * colonne à l'encre pleine parce que c'est elle qu'on lit pour se repérer. La
 * hiérarchie vient du poids et de l'encre, comme partout ailleurs dans le
 * produit.
 *
 * `tabular-nums` sur toute la grille : un dépôt met rarement des chiffres en
 * colonne, mais quand il le fait ils doivent s'aligner.
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
                  {/* Le titre de colonne accompagne sa valeur tant qu'il n'y a
                      pas de ligne d'en-tête pour le porter. */}
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
