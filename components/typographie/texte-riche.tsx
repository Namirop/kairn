import { Fragment } from "react";
import { BlocDeCode } from "@/components/typographie/bloc-de-code";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { blocsDeTexte } from "@/lib/domain/blocs-de-texte";

/**
 * Un texte long, rendu avec ce qu'il contient vraiment.
 *
 * `TexteTechnique` relève les termes de code cités **en ligne**, et c'est tout
 * ce qu'un titre ou une option de QCM demandent. Un texte déposé, lui, porte
 * aussi de la structure : des paragraphes, des extraits de plusieurs lignes, des
 * lignes coupées par l'éditeur d'où il vient. Ce composant-ci la rend ; il
 * s'emploie là où le contenu est de la lecture au long, jamais dans un titre —
 * un extrait en bloc n'a rien à faire dans un `h1`.
 *
 * La découpe et le recollage sont dans `blocsDeTexte`, pures et éprouvées. Ici,
 * il ne reste qu'à peindre.
 *
 * **La prose garde ses retours à la ligne restants.** `whitespace-pre-line` les
 * respecte, et ils ont tous une raison d'être à ce stade : ce sont les puces,
 * les entrées d'une liste et les séparations de paragraphes — les coupures
 * subies ont déjà été recollées en amont.
 */
export function TexteRiche({ children }: { children: string }) {
  const blocs = blocsDeTexte(children);

  return (
    <div className="gap-pas-4 flex flex-col">
      {blocs.map((bloc, rang) => (
        <Fragment key={rang}>
          {bloc.type === "code" ? (
            <BlocDeCode texte={bloc.texte} langage={bloc.langage} />
          ) : (
            <p className="whitespace-pre-line">
              <TexteTechnique>{bloc.texte}</TexteTechnique>
            </p>
          )}
        </Fragment>
      ))}
    </div>
  );
}
