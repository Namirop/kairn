import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";
import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";

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
 * `aria-label`, et il énonce le nombre de pierres. Et depuis le 13/09/2026 la
 * fiche s'ouvre aussi au doigt — voir `Infobulle` : « au survol » était une
 * façon de dire « sur un ordinateur », sur un produit qui s'installe d'abord sur
 * un téléphone.
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

/**
 * « Retenu » et non « consolidé » : le cairn compte deux états, la
 * consolidation que le produit constate et l'archivage que l'utilisateur
 * déclare. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 */
function legende(retenus: number): string {
  if (retenus === 0) return "Le premier concept retenu posera la première pierre.";

  return `${retenus} ${retenus === 1 ? "concept retenu" : "concepts retenus"}. Une pierre chacun.`;
}

export function ColonneCairn({ retenus, graines }: { retenus: number; graines: string[] }) {
  return (
    <aside className="md:mt-pas-16 flex w-full flex-col items-center md:max-w-96">
      <Infobulle
        /* Le déclencheur reste le bouton que Radix rend par défaut, comme pour
           la série et le niveau. Poser le dessin en `asChild` sur un `div`
           aurait sorti la légende du parcours clavier : un `div` ne prend pas
           le focus, et la fiche ne se serait ouverte qu'à la souris. */
        className="rounded-galet w-full"
        contenu={legende(retenus)}
      >
        {/* À zéro, le cairn ne rendait qu'un trait de sol au milieu du
                panneau : l'élément signature du produit y était un vide. On
                marque la place de la première pierre plutôt que d'en offrir une
                — voir `PierreAVenir`.

                La boîte se resserre en même temps. Une pierre seule est large et
                plate ; lui garder la hauteur d'un empilement de douze rendait le
                même vide qu'avant, avec un contour au milieu. */}
        {retenus === 0 ? (
          <div className="mx-auto h-28 w-full max-w-64 md:h-36 md:max-w-96">
            <PierreAVenir clair />
          </div>
        ) : (
          /* **Le dessin donne sa hauteur, la boîte ne la lui impose plus.**
               Elle était fixe — seize rems sur téléphone, vingt-six sur grand
               écran — alors que la hauteur d'un empilement suit son nombre de
               pierres : à deux pierres, le SVG s'y centrait et laissait deux
               cents pixels de roche vide au-dessus, autant en dessous.

               C'est le SVG qui porte la mesure, et non un `aspect-ratio` sur la
               boîte : le ratio venait du viewBox, il était donc juste, mais il
               demandait au conteneur de résoudre une hauteur que Safari iOS
               laissait à `auto` dans cette pile — bouton de l'info-bulle, aside
               en colonne. Le SVG retombait alors sur sa taille intrinsèque et
               débordait sur la bande de progression. Un SVG en largeur pleine et
               hauteur automatique tient son ratio de son viewBox, sans que
               personne n'ait rien à résoudre.

               Les bornes de hauteur restent, et reprennent la main passé une
               dizaine de pierres : l'empilement y devient plus haut que large,
               et le cadrage des grands cairns ne change pas. */
          <div className="mx-auto w-full max-w-64 md:max-w-96">
            <Cairn
              nombre={retenus}
              graines={graines}
              clair
              className="h-auto max-h-64 md:max-h-[26rem]"
            />
          </div>
        )}

        {/* Sous le dessin et centrée : c'est le seul déclencheur du produit qui
            n'a pas d'étiquette contre laquelle se poser. */}
        <span className="mt-pas-3 flex justify-center">
          <IndiceTactile className="ml-0" />
        </span>
      </Infobulle>
    </aside>
  );
}
