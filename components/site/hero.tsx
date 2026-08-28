import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
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
 * **Sur téléphone, le cairn était réduit de moitié, et il ne l'est plus.** Il
 * avait été ramené à une signature pour une raison qui tenait alors : posé sur
 * du papier vide, à sa taille de bureau, il occupait plus de hauteur que le
 * titre et la page disait « voici un dessin » avant de dire « tu retiens peu ».
 * Ce qui a changé n'est pas la taille, c'est ce qu'il y a autour — le paysage
 * descend maintenant sous le titre, et le cairn y est planté au lieu de
 * flotter. Un objet seul au milieu d'un blanc est une illustration ; le même
 * objet debout dans un terrain est le sujet d'une scène, et une scène a le
 * droit d'occuper la place. Il reprend donc l'ampleur qu'il avait perdue, et
 * les deux blocs s'écartent d'autant — le pas qui les serrait n'avait de sens
 * que face à un emblème réduit. Au-delà de `md`, rien de tout ça ne s'applique :
 * la composition de bureau est intacte.
 */
export function Hero({ connecte }: { connecte: boolean }) {
  return (
    <Panneau
      surface="papier"
      aere
      mesure="large"
      /* Sur téléphone, l'ouverture démarre juste sous l'en-tête. Le rythme de
         campagne ouvrait de cinquante pixels au-dessus du titre : de la marge
         prise sur le seul écran où la hauteur est comptée, et qui repoussait le
         cairn et son geste sous le pli. Au-delà de `md`, le rythme reprend
         intact — c'est là qu'il a un sens, il y a la hauteur pour le porter. */
      className="max-md:pt-pas-4 gap-pas-12 grid items-center md:min-h-[calc(100svh-5rem-2rem)] md:grid-cols-[1.7fr_1fr] md:items-end"
      fond={<PaysageDeCairns />}
    >
      {/* Le titre passe **devant** les pierres.

          Les deux colonnes sont sœurs dans la même grille, et le cairn arrive
          après dans le balisage : sans rien, c'est lui qui se peint par-dessus.
          Ça ne se voyait pas tant qu'il tenait debout — il est à droite, le
          titre à gauche — mais renversé, ses pierres traversent l'écran et
          venaient recouvrir la phrase. Une pierre qui roule devant le texte
          efface ce qu'on est venu lire ; derrière, elle passe, et la seconde
          ligne étant évidée, on la voit même passer au travers des lettres.

          Un rang de plus sur le titre suffit : le bloc du cairn reste au sien.

          L'ouverture a la même hauteur pour tout le monde, parce qu'elle porte
          un geste dans les deux cas. Elle n'en portait qu'un pour les visiteurs,
          et le bloc commençait alors soixante-huit pixels plus bas chez les
          autres — la hauteur du bouton absent, les deux colonnes se calant en
          bas. On compensait ce trou ; il n'y en a plus. */}
      <Apparition className="md:pb-pas-24 relative z-10">
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

        {/* Le geste de l'ouverture, et il s'adresse à tout le monde — seule sa
            destination change.

            Il n'existait que pour les visiteurs, parce qu'il pointait vers un
            panneau d'essai que les autres n'ont pas : une porte sur un mur. Mais
            quelqu'un de connecté vient ici pour une raison, et c'est la même à
            un mot près — il ne veut pas essayer le produit, il veut retrouver
            sa journée. Le lien mène donc là, plutôt que de laisser l'ouverture
            sans issue et de reporter l'action dans un panneau plus bas que
            personne n'a envie d'aller chercher.

            Il porte sa surface, et pour la raison qui a rempli le titre creux :
            un bouton en contour n'a pas de fond, donc une pierre renversée se
            voyait au travers. Le papier du panneau referme la fenêtre, et le
            survol continue de le foncer comme partout ailleurs. */}
        <Temps>
          <Button
            asChild
            variant="outline"
            size="lg"
            /* Un cran plus petit sur téléphone : à la taille de bureau, le
               bouton était le second objet le plus haut de l'écran après le
               titre, pour une action secondaire — le sujet de l'ouverture est
               la phrase, pas le geste. Il reprend sa pleine taille dès `md`. */
            className="mt-pas-4 md:mt-pas-6 bg-surface-papier max-md:px-pas-6 max-md:text-petit max-md:h-10"
          >
            {connecte ? (
              <Link href={ROUTES.aujourdhui}>Aujourd&apos;hui</Link>
            ) : (
              <a href="#depot">Essayer sans compte</a>
            )}
          </Button>
        </Temps>
      </Apparition>

      {/* Sur téléphone, l'emblème descend sous le rythme bas du panneau.

          Le rembourrage de campagne le calait à soixante-quatre pixels du bord,
          soit exactement la hauteur de la crête proche : il se posait donc sur la
          ligne d'horizon au lieu de se tenir dans la butte.

          **Il descend maintenant jusqu'à mi-butte**, et c'est la mesure qui
          compte, pas le nombre de pas : la crête proche est à 11,5 % de la
          hauteur du panneau (`PLANS_TELEPHONE`), la butte va de là jusqu'au bas,
          et le pied de la pierre la plus basse se pose à la moitié de cette
          bande. Un cran de moins le laissait au-dessus, à une quinzaine de
          pixels — assez pour qu'il ait l'air posé dessus plutôt que planté
          dedans. Si la crête bouge, cette valeur se remesure. */}
      <div className="-mb-pas-12 md:pb-pas-24 flex justify-center md:mb-0">
        <div className="relative aspect-[100/93] w-[min(62vw,17rem)] md:aspect-auto md:h-[clamp(20rem,52vh,36rem)] md:w-full">
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
