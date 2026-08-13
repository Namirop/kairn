import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * L'élément signature et ce qu'il compte.
 *
 * Il vit sur le panneau de roche — l'un des deux de toute l'application. Les
 * pierres s'y inversent en gris clairs, et le sommet garde son lichen : c'est
 * la constante de l'identité, et la seule occurrence d'accent sur ce panneau.
 *
 * La colonne ne porte plus que l'empilement. La série et le niveau sont
 * descendus en bande sous les deux colonnes — voir `ProgressionDuCairn`.
 *
 * Le décompte est passé sous l'empilement puis dans une info-bulle, comme celles
 * de la série et du niveau : trois éléments qui s'expliquent au survol plutôt
 * que trois légendes empilées. Le dessin gagne la place que la légende prenait,
 * et il en avait besoin — c'est l'élément signature du produit.
 *
 * Le compte reste dit sans survol pour qui ne survole pas : `Cairn` porte son
 * `aria-label`, et il énonce le nombre de pierres.
 *
 * La colonne est posée un cran sous l'axe du texte plutôt qu'exactement dessus.
 * Centré au pixel, l'empilement paraissait encore haut : sa masse visible est en
 * bas — le sol et les grosses pierres — alors que sa boîte compte aussi l'air
 * au-dessus du sommet. L'œil aligne les masses, pas les boîtes.
 *
 * La marge vaut le double de la descente obtenue : la rangée centre ses deux
 * colonnes, donc elle en reprend la moitié. Régler ça au jugé sans mesurer
 * donnait un décalage deux fois trop discret.
 */

function legende(consolides: number): string {
  if (consolides === 0) return "Le premier concept consolidé posera la première pierre.";

  return `${consolides} ${consolides === 1 ? "concept consolidé" : "concepts consolidés"}. Une pierre chacun.`;
}

export function ColonneCairn({ consolides, graines }: { consolides: number; graines: string[] }) {
  return (
    <aside className="md:mt-pas-16 flex w-full flex-col items-center md:max-w-96">
      <Tooltip>
        {/* Le déclencheur reste le bouton que Radix rend par défaut, comme pour
            la série et le niveau. Poser le dessin en `asChild` sur un `div`
            aurait sorti la légende du parcours clavier : un `div` ne prend pas
            le focus, et l'info-bulle ne se serait ouverte qu'à la souris. */}
        <TooltipTrigger className="rounded-galet w-full">
          {/* À zéro, le cairn ne rendait qu'un trait de sol au milieu du
                panneau : l'élément signature du produit y était un vide. On
                marque la place de la première pierre plutôt que d'en offrir une
                — voir `PierreAVenir`.

                La boîte se resserre en même temps. Une pierre seule est large et
                plate ; lui garder la hauteur d'un empilement de douze rendait le
                même vide qu'avant, avec un contour au milieu. */}
          {consolides === 0 ? (
            <div className="mx-auto h-28 w-full max-w-64 md:h-36 md:max-w-96">
              <PierreAVenir clair />
            </div>
          ) : (
            <div className="mx-auto h-64 w-full max-w-64 md:h-[26rem] md:max-w-96">
              <Cairn nombre={consolides} graines={graines} clair />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>{legende(consolides)}</TooltipContent>
      </Tooltip>
    </aside>
  );
}
