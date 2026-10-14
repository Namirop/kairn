import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { debutDuCommentaire } from "@/lib/domain/commentaire-de-code";

/**
 * Les lignes d'un extrait, peintes. Une seule nuance, le commentaire : pas de
 * coloration syntaxique, la palette n'a pas de couleurs à y consacrer.
 *
 * L'extrait défile dans sa boîte, jamais la page : couper une ligne de code
 * à la fenêtre la changerait. Seul défilement horizontal du produit, avec son
 * propre ascenseur — celui du système est un rail clair sur un bloc sombre.
 */
export function LignesDeCode({
  texte,
  langage,
  className,
}: {
  texte: string;
  langage: string | null;
  className?: string;
}) {
  return (
    <pre
      className={cn("px-pas-4 py-pas-3 ascenseur-sur-roche overflow-auto [tab-size:2]", className)}
    >
      <code className="text-petit font-mono leading-relaxed text-stone-50">
        {texte.split("\n").map((ligne, rang) => (
          <Fragment key={rang}>
            {rang > 0 ? "\n" : null}
            <Ligne texte={ligne} langage={langage} />
          </Fragment>
        ))}
      </code>
    </pre>
  );
}

function Ligne({ texte, langage }: { texte: string; langage: string | null }) {
  const debut = debutDuCommentaire(texte, langage);

  if (debut === -1) return <>{texte || " "}</>;

  return (
    <>
      {texte.slice(0, debut)}
      <span className="text-stone-400">{texte.slice(debut)}</span>
    </>
  );
}
