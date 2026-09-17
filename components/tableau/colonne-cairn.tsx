import { Cairn } from "@/components/cairn/cairn";
import { PierreAVenir } from "@/components/cairn/pierre-a-venir";

/**
 * L'élément signature, et rien d'autre.
 *
 * Il vit sur le panneau de roche — l'un des deux de toute l'application. Les
 * pierres s'y inversent en gris clairs, et le sommet passe au glacier vif : c'est
 * la constante de l'identité, et la seule occurrence d'accent sur ce panneau.
 *
 * La colonne ne porte plus que l'empilement. La série et le niveau sont
 * descendus en bande sous les deux colonnes — voir `ProgressionDuCairn` —, et le
 * décompte est remonté contre le titre de la section — voir `TitreDuCairn`.
 *
 * **Le dessin n'est plus un déclencheur.** Il a porté la légende du compte,
 * d'abord en texte sous lui, puis dans une info-bulle. Les deux fois, la légende
 * flottait au milieu d'un panneau sans rien contre quoi se poser ; la marque
 * tactile qui l'annonçait, encore plus. Elle est allée contre le titre, qui est
 * l'endroit où l'on cherche ce genre d'explication — et le dessin redevient ce
 * qu'il est, la seule audace visuelle du produit.
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
export function ColonneCairn({ retenus, graines }: { retenus: number; graines: string[] }) {
  return (
    <aside className="md:mt-pas-16 flex w-full flex-col items-center md:max-w-96">
      {/* À zéro, le cairn ne rendait qu'un trait de sol au milieu du panneau :
          l'élément signature du produit y était un vide. On marque la place de
          la première pierre plutôt que d'en offrir une — voir `PierreAVenir`.

          La boîte se resserre en même temps. Une pierre seule est large et
          plate ; lui garder la hauteur d'un empilement de douze rendait le même
          vide qu'avant, avec un contour au milieu. */}
      {retenus === 0 ? (
        <div className="mx-auto h-28 w-full max-w-64 md:h-36 md:max-w-96">
          <PierreAVenir clair />
        </div>
      ) : (
        /* **Le dessin donne sa hauteur, la boîte ne la lui impose plus.** Elle
           était fixe — seize rems sur téléphone, vingt-six sur grand écran —
           alors que la hauteur d'un empilement suit son nombre de pierres : à
           deux pierres, le SVG s'y centrait et laissait deux cents pixels de
           roche vide au-dessus, autant en dessous.

           C'est le SVG qui porte la mesure, et non un `aspect-ratio` sur la
           boîte : le ratio venait du viewBox, il était donc juste, mais il
           demandait au conteneur de résoudre une hauteur que Safari iOS laissait
           à `auto` dans cette pile. Le SVG retombait alors sur sa taille
           intrinsèque et débordait sur la bande de progression. Un SVG en
           largeur pleine et hauteur automatique tient son ratio de son viewBox,
           sans que personne n'ait rien à résoudre.

           Les bornes de hauteur restent, et reprennent la main passé une dizaine
           de pierres : l'empilement y devient plus haut que large, et le cadrage
           des grands cairns ne change pas. */
        <div className="mx-auto w-full max-w-64 md:max-w-96">
          <Cairn
            nombre={retenus}
            graines={graines}
            clair
            className="h-auto max-h-64 md:max-h-[26rem]"
          />
        </div>
      )}
    </aside>
  );
}
