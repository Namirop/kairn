import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import { Button } from "@/components/ui/button";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { PaysageDeCairns } from "@/components/site/paysage-de-cairns";

/**
 * L'ouverture. Titre à gauche, cairn à droite, un pli.
 *
 * **Le titre arrive en deux temps.** « Tu lis beaucoup » est un constat, « Tu
 * retiens peu » son retournement — décalage d'un dixième de seconde entre les
 * deux blocs.
 *
 * **Et il arrive en deux matières.** Le constat est plein, le retournement est
 * creux : la ligne perd sa chair au moment où elle dit qu'on perd ce qu'on a
 * lu. C'est la seule figure de style du site, elle porte la phrase qui porte le
 * produit, et elle ne coûte rien à la lecture — le contour tient le contraste
 * d'un texte, pas d'un ornement (voir `titre-creux` dans `globals.css`).
 *
 * **Et la seconde ligne se vide sous les yeux.** Elle était creuse d'emblée,
 * donc la phrase la plus importante de la page arrivait déjà oubliée, sans
 * qu'on ait rien vu se perdre. Elle arrive maintenant pleine, et son encre s'en
 * va — voir `ligne-oubli`. C'est le seul moment écrit de l'ouverture ; tout le
 * reste du mouvement y était déjà et n'a pas bougé.
 *
 * **Le paysage se pose avant elle**, du plus proche au plus lointain : on
 * arrive au sol, puis on lève les yeux, puis la phrase se vide.
 *
 * **Le titre a sa propre échelle, `--t-ouverture`, et elle se mesure à sa
 * colonne**, pas à la fenêtre : il grandit jusqu'à la largeur disponible sans
 * jamais passer à la ligne.
 *
 * **L'ouverture porte un geste, en contour**, et il ne s'adresse qu'aux
 * visiteurs : quelqu'un de connecté voit un mot de reprise plus bas, pas
 * l'essai.
 *
 * **Les deux colonnes se calent en bas.** Centrées, elles ne se déplaçaient que
 * de la moitié de la marge qu'on leur donnait ; calées, elles se placent à la
 * distance qu'on leur donne. Le rembourrage bas est le seul réglage à toucher,
 * et il est posé sur les deux — n'en décaler qu'une ferait glisser le cairn par
 * rapport au titre alors qu'ils tiennent la même ligne d'horizon.
 *
 * **Sur téléphone, le cairn est un emblème et non une image.** À sa taille de
 * bureau il occupait plus de hauteur que le titre sur un écran de trois cent
 * quatre-vingt-dix : la page disait « voici un dessin » avant de dire « tu
 * retiens peu ». À la moitié il redevient une signature, la phrase reprend la
 * main, et les blocs se serrent d'un pas — le vide qui les séparait n'avait
 * plus lieu d'être une fois l'emblème réduit. Au-delà de `md`, rien de tout ça
 * ne s'applique : la composition de bureau est intacte.
 */
export function Hero({ connecte }: { connecte: boolean }) {
  return (
    <Panneau
      surface="papier"
      aere
      mesure="large"
      className="gap-pas-6 md:gap-pas-12 grid items-center md:min-h-[calc(100svh-5rem-2rem)] md:grid-cols-[1.7fr_1fr] md:items-end"
      fond={<PaysageDeCairns />}
    >
      <Apparition className="md:pb-pas-24">
        <h1 className="font-display text-ouverture leading-[0.95] font-bold tracking-[-0.03em] text-balance md:leading-[0.84] md:tracking-[-0.045em]">
          <Temps balise="span" className="block">
            Tu lis beaucoup.
          </Temps>

          {/* Le creux occupe le flux, le plein se pose dessus et s'en va : la
              hauteur du titre ne dépend donc jamais de l'animation. Les deux
              copies sont masquées aux lecteurs d'écran, qui n'annoncent que la
              troisième — sans quoi la phrase serait lue trois fois. */}
          <Temps balise="span" className="ligne-oubli block">
            <span aria-hidden className="titre-creux block">
              Tu retiens peu.
            </span>
            <span aria-hidden className="oubli-plein">
              Tu retiens peu.
            </span>
            <span className="sr-only">Tu retiens peu.</span>
          </Temps>
        </h1>

        {/* Le seul geste de l'ouverture, et il ne s'adresse qu'aux visiteurs.
            Quelqu'un de connecté ne voit pas l'essai plus bas mais un mot de
            reprise, qui porte déjà son propre bouton, et l'en-tête lui propose
            « Aujourd'hui ». Lui poser ici un lien vers un panneau qui n'existe
            pas pour lui serait une porte sur un mur. */}
        {connecte ? null : (
          <Temps>
            <Button asChild variant="outline" size="lg" className="mt-pas-4 md:mt-pas-6">
              <a href="#depot">Essayer sans compte</a>
            </Button>
          </Temps>
        )}
      </Apparition>

      <div className="md:pb-pas-24 flex justify-center">
        <div className="relative aspect-[100/93] w-[min(42vw,12rem)] md:aspect-auto md:h-[clamp(18rem,42vh,30rem)] md:w-full">
          <span
            aria-hidden
            className="rounded-galet absolute bottom-[1%] left-1/2 h-[5%] w-[56%] -translate-x-1/2 bg-stone-900 opacity-[0.15] blur-[9px]"
          />
          <CairnRenversable nombre={7} />
        </div>
      </div>
    </Panneau>
  );
}
