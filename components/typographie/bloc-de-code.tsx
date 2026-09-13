import { Fragment } from "react";
import { debutDuCommentaire } from "@/lib/domain/commentaire-de-code";

/**
 * Un extrait de code cité en bloc.
 *
 * **Il est sur la roche, et c'est la seule chose de ce produit qui s'y pose sans
 * être un panneau.** Le choix n'est pas décoratif : un extrait de code est du
 * texte qu'on ne lit pas, qu'on recopie — il n'appartient pas au flux de la
 * phrase, et la surface le dit mieux qu'un filet ou qu'un encadré. La roche
 * existe déjà dans le produit, elle n'ajoute donc aucune couleur ; c'est la même
 * encre que sur le panneau du cairn.
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
 * accepte un défilement horizontal, et il est borné à ce cadre.
 */

function Ligne({ texte, langage }: { texte: string; langage: string | null }) {
  const debut = debutDuCommentaire(texte, langage);

  if (debut === -1) return <>{texte || " "}</>;

  return (
    <>
      {texte.slice(0, debut)}
      <span className="text-stone-400">{texte.slice(debut)}</span>
    </>
  );
}

export function BlocDeCode({ texte, langage }: { texte: string; langage: string | null }) {
  const lignes = texte.split("\n");

  return (
    <div className="rounded-carte bg-surface-roche overflow-hidden">
      {langage ? (
        <p className="px-pas-4 py-pas-2 text-mono border-b border-stone-700 font-mono tracking-[0.14em] text-stone-400 uppercase">
          {langage}
        </p>
      ) : null}

      {/* `tabular-nums` n'a rien à faire ici : ce n'est pas une colonne de
          chiffres. `tab-size` en revanche décide de la largeur d'une
          indentation tabulée, et le défaut du navigateur est de huit — de quoi
          pousser la première ligne d'une fonction hors du cadre. */}
      <pre className="px-pas-4 py-pas-3 overflow-x-auto [tab-size:2]">
        <code className="text-petit font-mono leading-relaxed text-stone-50">
          {lignes.map((ligne, rang) => (
            <Fragment key={rang}>
              {rang > 0 ? "\n" : null}
              <Ligne texte={ligne} langage={langage} />
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
