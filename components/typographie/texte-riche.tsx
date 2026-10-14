import { Fragment } from "react";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TableauDeProse } from "@/components/typographie/tableau-de-prose";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { blocsDeTexte } from "@/lib/domain/blocs-de-texte";
import { elementsDeProse, type ElementDeProse } from "@/lib/domain/structure-de-prose";

/**
 * Un texte déposé, rendu avec sa structure : titres, listes, tableaux, blocs de
 * code. Pour la lecture au long seulement ; dans un titre ou une option de QCM,
 * `TexteTechnique` suffit. La découpe vit dans `blocsDeTexte` et
 * `elementsDeProse`.
 *
 * `whitespace-pre-line` est sûr ici : les coupures subies ont été recollées en
 * amont, les retours restants sont voulus.
 */

/**
 * De l'air au-dessus d'un titre, rien en dessous : c'est l'espacement, plus que
 * la taille, qui fait la hiérarchie. Le premier élément n'en prend pas.
 */
const TITRES: Record<1 | 2 | 3, string> = {
  1: "mt-pas-6 text-corps font-semibold text-stone-900",
  2: "mt-pas-6 text-petit font-semibold text-stone-900",
  3: "mt-pas-4 text-petit font-medium text-stone-900",
};

/**
 * Les titres d'un dépôt descendent de deux crans : le composant vit sous le
 * `h1` de la page et le `h2` de sa section, et un `#` rendu en `h1` casserait
 * le plan du document au lecteur d'écran.
 */
const BALISES: Record<1 | 2 | 3, "h3" | "h4" | "h5"> = { 1: "h3", 2: "h4", 3: "h5" };

function Titre({ niveau, texte }: { niveau: 1 | 2 | 3; texte: string }) {
  const Balise = BALISES[niveau];

  return (
    <Balise className={`${TITRES[niveau]} first:mt-0`}>
      {/* Un titre peut citer du code (« Le dossier `android/` »). */}
      <TexteTechnique>{texte}</TexteTechnique>
    </Balise>
  );
}

/**
 * Une liste, à puces ou numérotée. Une liste numérotée reprend au numéro écrit
 * dans le dépôt, pas à un.
 */
function Liste({ element }: { element: Extract<ElementDeProse, { type: "liste" }> }) {
  const entrees = element.entrees.map((entree, rang) => (
    <li key={rang} className="pl-pas-1">
      <TexteTechnique>{entree}</TexteTechnique>
    </li>
  ));

  if (element.ordonnee) {
    return (
      <ol
        start={element.depart}
        className="gap-pas-1 pl-pas-6 marker:text-mono flex list-outside list-decimal flex-col marker:font-mono marker:text-stone-500 marker:tabular-nums"
      >
        {entrees}
      </ol>
    );
  }

  return (
    <ul className="gap-pas-1 pl-pas-4 flex list-outside list-disc flex-col marker:text-stone-300">
      {entrees}
    </ul>
  );
}

function Element({ element }: { element: ElementDeProse }) {
  if (element.type === "titre") return <Titre niveau={element.niveau} texte={element.texte} />;

  if (element.type === "liste") return <Liste element={element} />;

  if (element.type === "tableau") {
    return <TableauDeProse entetes={element.entetes} lignes={element.lignes} />;
  }

  return (
    <p className="whitespace-pre-line">
      <TexteTechnique>{element.texte}</TexteTechnique>
    </p>
  );
}

export function TexteRiche({ children }: { children: string }) {
  const blocs = blocsDeTexte(children);

  return (
    <div className="gap-pas-3 flex flex-col">
      {blocs.map((bloc, rang) => (
        <Fragment key={rang}>
          {bloc.type === "code" ? (
            <BlocDeCode texte={bloc.texte} langage={bloc.langage} />
          ) : (
            elementsDeProse(bloc.texte).map((element, place) => (
              <Element key={place} element={element} />
            ))
          )}
        </Fragment>
      ))}
    </div>
  );
}
