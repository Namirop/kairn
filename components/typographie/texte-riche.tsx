import { Fragment } from "react";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TableauDeProse } from "@/components/typographie/tableau-de-prose";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { blocsDeTexte } from "@/lib/domain/blocs-de-texte";
import { elementsDeProse, type ElementDeProse } from "@/lib/domain/structure-de-prose";

/**
 * Un texte long, rendu avec ce qu'il contient vraiment.
 *
 * `TexteTechnique` relève les termes de code cités **en ligne**, et c'est tout
 * ce qu'un titre ou une option de QCM demandent. Un texte déposé, lui, porte
 * aussi de la structure : des titres, des listes, des tableaux, des extraits de
 * plusieurs lignes, des lignes coupées par l'éditeur d'où il vient. Ce composant
 * la rend ; il s'emploie là où le contenu est de la lecture au long, jamais dans
 * un titre — un extrait en bloc n'a rien à faire dans un `h1`.
 *
 * La découpe et le recollage sont dans `blocsDeTexte` et `elementsDeProse`,
 * pures et éprouvées. Ici, il ne reste qu'à peindre.
 *
 * **Le registre est celui de l'application, pas celui de la vitrine.** Pas de
 * police display, pas de gros titres : un dépôt est de la lecture utilitaire, et
 * ses trois niveaux se distinguent par l'encre, le poids et surtout l'air qu'on
 * leur laisse au-dessus. C'est l'écart d'espacement qui fait la hiérarchie ; les
 * tailles, elles, restent proches parce que le bloc entier tient en quatorze
 * points.
 *
 * **La prose garde ses retours à la ligne restants.** `whitespace-pre-line` les
 * respecte, et ils ont tous une raison d'être à ce stade : les coupures subies
 * ont été recollées en amont, les puces et les rangées de tableau sont devenues
 * des listes et des tableaux.
 */

/**
 * L'air au-dessus d'un titre, et rien en dessous.
 *
 * Un titre appartient à ce qui le suit : le coller à son paragraphe et l'écarter
 * de ce qui précède est ce qui le fait lire comme un titre, bien plus que deux
 * points de corps en plus. Le premier élément n'en prend pas — un blanc en haut
 * d'une carte n'est pas de la hiérarchie, c'est un trou.
 */
const TITRES: Record<1 | 2 | 3, string> = {
  1: "mt-pas-6 text-corps font-semibold text-stone-900",
  2: "mt-pas-6 text-petit font-semibold text-stone-900",
  3: "mt-pas-4 text-petit font-medium text-stone-900",
};

/**
 * Les titres d'un dépôt descendent de deux crans, et c'est volontaire.
 *
 * Ce composant vit sous le titre de page et sous celui de la section qui le
 * porte — « Ce que tu as déposé ». Rendre un `#` en `h1` casserait le plan du
 * document pour qui navigue au clavier ou au lecteur d'écran ; on décale donc
 * la hiérarchie du dépôt sous celle de l'écran, où elle a sa place.
 */
const BALISES: Record<1 | 2 | 3, "h3" | "h4" | "h5"> = { 1: "h3", 2: "h4", 3: "h5" };

function Titre({ niveau, texte }: { niveau: 1 | 2 | 3; texte: string }) {
  const Balise = BALISES[niveau];

  return (
    <Balise className={`${TITRES[niveau]} first:mt-0`}>
      {/* Un titre cite du code comme le reste du dépôt — « Le dossier
          `android/` » —, et l'oublier ici affichait les accents graves en clair
          dans le seul endroit où ils se voyaient le plus. */}
      <TexteTechnique>{texte}</TexteTechnique>
    </Balise>
  );
}

/**
 * Une liste, à puces ou numérotée.
 *
 * La marque est en retrait — gris lichen pour un numéro, gris clair pour une
 * puce — parce qu'elle sert à compter, pas à se faire voir. Le numéro est en
 * mono : c'est le rôle « données » de l'échelle typographique, et un compteur en
 * est un. La liste reprend au numéro écrit dans le dépôt, jamais à un.
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
