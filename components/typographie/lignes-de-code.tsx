import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { debutDuCommentaire } from "@/lib/domain/commentaire-de-code";

/**
 * Les lignes d'un extrait, peintes.
 *
 * **Une seule nuance, et c'est le commentaire.** Un thème complet peindrait sept
 * couleurs là où le produit n'en porte qu'une, et cet accent-là appartient au
 * lichen et à l'ember. Le commentaire n'est pas une catégorie de plus : c'est la
 * seule partie d'une ligne qui ne s'exécute pas, et sur l'extrait qui a fait
 * écrire ce composant, c'était lui qui portait l'explication. Il s'écarte donc
 * d'un ton, et rien d'autre ne bouge.
 *
 * **L'extrait défile dans sa boîte, jamais la page.** Une ligne de code est
 * aussi longue qu'elle l'est, et la couper à la fenêtre en fait une ligne
 * différente de celle qu'on a déposée. C'est le seul endroit du produit où l'on
 * accepte un défilement horizontal, et il est borné à ce cadre — avec son propre
 * ascenseur, parce que celui du système est un rail clair en travers d'un bloc
 * sombre.
 *
 * À part, parce que deux cadres les montrent : la carte dans le flux du texte,
 * et la même en grand par-dessus la page.
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
