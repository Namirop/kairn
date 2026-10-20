import { Fragment } from "react";
import { cn } from "@/lib/fusion-des-classes";
import { debutDuCommentaire } from "@/lib/domain/commentaire-de-code";

/**
 * Seul le commentaire est nuancé : la palette n'a pas de couleurs pour une
 * coloration syntaxique. L'extrait défile dans sa boîte : couper une ligne de
 * code la changerait. Ascenseur propre : celui du système est un rail clair.
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
