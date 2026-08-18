import Link from "next/link";
import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import { Button } from "@/components/ui/button";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'ouverture. Le titre porte la composition à lui seul : pas de dégradé, pas
 * de halo, pas d'illustration pour compenser. L'empilement de pierres à côté
 * est l'élément signature, et il est le même que celui du tableau de bord.
 *
 * Il n'a plus de cartouche. Le cadre d'ombre tenait la colonne de droite, mais
 * il enfermait aussi ce qui doit pouvoir en sortir : les pierres traversent
 * maintenant la composition quand on coupe l'empilement. C'est la taille du
 * cairn qui occupe la colonne désormais — il monte à toute la hauteur du
 * panneau plutôt que de flotter au milieu d'un rectangle.
 *
 * **L'ouverture fait exactement un pli.** Elle mesurait la même chose en pixels
 * de sept cent soixante-huit à vingt-cinq cents de large, si bien qu'elle ouvrait
 * juste sur un grand écran et débordait sur un mille quatre-vingts : le champ de
 * dépôt et le lien de connexion passaient sous le pli, sur l'écran le plus
 * répandu du monde. Le panneau prend donc la hauteur qui reste sous l'en-tête, et
 * son contenu s'y centre ; ce qui l'occupe — le titre, le rythme du panneau, la
 * hauteur du cairn — se mesure à la fenêtre. La jointure de roche tombe alors au
 * pli quel que soit l'écran, et c'est elle qui invite à descendre.
 *
 * **Le titre arrive en deux temps, parce que c'est une phrase en deux temps.**
 * « Tu lis beaucoup » est un constat, « Tu retiens peu » est son retournement :
 * affichées ensemble, les deux lignes laissent l'œil choisir par où commencer et
 * le retournement se perd. Ce sont donc deux blocs et non un saut de ligne — ce
 * qui permet de les décaler d'un dixième de seconde, et c'est tout ce qu'il faut.
 */
export function Hero({
  invite,
  essaiPrecedent,
  connecte,
}: {
  invite: string;
  essaiPrecedent: AvancementDeLEssai | null;
  connecte: boolean;
}) {
  return (
    <Panneau
      surface="papier"
      aere
      // La hauteur de l'en-tête, seul élément fixe au-dessus, **moins deux pas** :
      // c'est ce qui laisse la coupe de roche entamer le bas de l'écran. Un pli
      // net donnait une ouverture qui avait l'air d'être toute la page ; une
      // jointure à moitié visible dit qu'il y a autre chose dessous, et le dit
      // mieux qu'une flèche.
      //
      // `svh` et non `dvh` : sur un mobile, la barre d'adresse qui se replie
      // ferait grandir le panneau pendant qu'on lit, et le contenu sauterait sous
      // les yeux.
      className="gap-pas-6 md:gap-pas-12 grid items-center md:min-h-[calc(100svh-4rem-2rem)] md:grid-cols-[1.4fr_1fr]"
    >
      <Apparition>
        {/* L'interligne s'ouvre d'un cheveu sous le point de bascule. À 0,95 sur
            un titre qui tient désormais sur trois ou quatre lignes étroites, le
            jambage du « p » de « peu » venait toucher la ligne suivante — un
            resserrement qui pose une composition sur deux lignes larges devient
            une collision dès qu'il y en a quatre. */}
        <h1 className="font-display text-h1-site leading-[1.02] font-bold tracking-[-0.03em] text-balance md:leading-[0.95]">
          <Temps balise="span" className="block">
            Tu lis beaucoup.
          </Temps>
          <Temps balise="span" className="block">
            Tu retiens peu.
          </Temps>
        </h1>

        <Temps>
          <p className="mt-pas-4 md:mt-pas-6 max-w-md text-stone-500">
            {connecte
              ? "Ce que tu as déposé t'attend, et revient quand il est sur le point de partir."
              : "Un article, une réponse qu'on t'a donnée, une page de manuel, ce qu'un collègue vient de t'expliquer. Kairn le découpe en concepts et te les repose juste avant que tu les oublies."}
          </p>
        </Temps>

        {/* Pour un visiteur, le champ et pas un bouton vers une inscription :
            c'est le découpage qui convainc, et le montrer coûte une extraction.

            Pour quelqu'un de connecté, surtout pas ce champ-là. Il ouvrirait une
            visite anonyme et rattacherait son dépôt à un cookie plutôt qu'à son
            compte — le texte serait effacé au bout de sept jours par le cron,
            sans qu'il ait rien fait de travers. Une seule action à la place,
            celle du même mot que la navigation. */}
        {connecte ? (
          <Temps>
            <Button asChild size="lg" className="mt-pas-8">
              <Link href={ROUTES.aujourdhui}>Aujourd&apos;hui</Link>
            </Button>
          </Temps>
        ) : (
          <>
            <Temps className="mt-pas-6 md:mt-pas-8">
              <EssaiDeDepot invite={invite} essaiPrecedent={essaiPrecedent} />
            </Temps>

            {/* Le rappel de connexion se serre contre l'essai sur une colonne.
                Il en est la porte de sortie, pas un sujet à lui seul, et un pas
                de campagne entre les deux le faisait flotter au milieu d'un
                blanc — puis un autre blanc le séparait du cairn. Trois blocs
                séparés par des vides identiques ne se hiérarchisent plus. */}
            <Temps>
              <p className="mt-pas-4 md:mt-pas-6 text-petit text-stone-500">
                Déjà un compte ?{" "}
                <Link
                  href={ROUTES.connexion}
                  className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
                >
                  Se connecter
                </Link>
              </p>
            </Temps>
          </>
        )}
      </Apparition>

      <div className="flex justify-center">
        {/* Sa hauteur suit celle de la fenêtre, entre dix-huit et trente rem :
            posé à trente sur un portable de six cent cinquante pixels utiles, il
            poussait à lui seul le reste de la colonne sous le pli.

            Sur une colonne, c'est **la largeur** qui commande, et la boîte prend
            la proportion du dessin. Elle était deux fois plus haute que large :
            l'empilement, qui rentre en entier dans ce qu'on lui donne, se réglait
            donc sur les cent soixante-seize pixels de largeur et laissait le
            reste en air. Il paraissait minuscule au milieu d'un vide qu'il avait
            lui-même réservé — alors que c'est le seul objet de la page qui
            raconte le produit sans une phrase, et le seul avec quoi on puisse
            jouer. */}
        <div className="aspect-square w-[min(76vw,22rem)] md:aspect-auto md:h-[clamp(18rem,42vh,30rem)] md:w-full">
          <CairnRenversable nombre={7} />
        </div>
      </div>
    </Panneau>
  );
}
