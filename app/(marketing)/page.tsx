import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Essai } from "@/components/site/essai";
import { Hero } from "@/components/site/hero";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireLEssaiEnCours } from "@/lib/depots/essai-en-cours";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";

/**
 * La page publique : une pile de panneaux, chacun avec sa surface, séparés par
 * des coupes de roche. On descend une paroi, on ne suit pas un article.
 *
 * Chaque jointure porte sa propre graine — les trois coupes ne se ressemblent
 * pas, et c'est ce qui les empêche de redevenir un séparateur de gabarit.
 */
/** Rendue à la demande : l'invite du champ change à chaque chargement. */
export const dynamic = "force-dynamic";

export default async function PageAccueil() {
  // Lu ici et non dans le composant : quelqu'un qui revient doit retrouver ses
  // concepts au premier rendu, pas après un aller-retour.
  const essaiPrecedent = await lireLEssaiEnCours();
  const connecte = (await getCurrentUser()) !== null;

  return (
    <>
      {/* Le hero porte le même titre et le même cairn pour tout le monde ; son
          geste mène à l'essai ou à la journée selon l'état. */}
      <Hero connecte={connecte} />

      {/* L'essai n'existe que pour un visiteur, et sa jointure avec lui.

          Quelqu'un de connecté voyait ici un panneau « Reprends » : un titre,
          une ligne, un bouton, dans la mesure d'une colonne et au milieu d'un
          panneau aéré. C'était la place de l'essai — le moteur de la page —
          occupée par trois éléments qui n'avaient pas de quoi la remplir, pour
          proposer une journée que l'en-tête proposait déjà et que le hero
          propose maintenant. Le panneau est parti ; le geste est remonté là où
          on regarde en premier.

          Le hero se termine sur son sol d'ombre, et l'essai est du papier :
          c'est exactement ce qu'une coupe de roche sait faire.

          Sans essai, les deux surfaces qui se touchent sont de l'ombre — et la
          coupe reste, d'ombre vers ombre. On avait cru pouvoir s'en passer :
          pas de changement de teinte, donc pas de jointure à peindre. Mais
          l'ombre et le papier ne se séparent que de quelques centièmes de
          luminance, et deux panneaux d'ombre bout à bout ne se séparaient de
          rien du tout — le sentier avait l'air de continuer l'ouverture. Ce qui
          fait la jointure ici n'est pas le contraste, c'est la matière : une
          strate se voit même quand la roche est la même des deux côtés. */}
      {connecte ? null : (
        <>
          <Strates de="ombre" vers="papier" graine="accueil-essai" />
          <Essai invite={inviteDeDepot(Math.random())} essaiPrecedent={essaiPrecedent} />
        </>
      )}

      <Strates de={connecte ? "ombre" : "papier"} vers="ombre" graine="accueil-sentier" />
      <Sentier />
      <Strates de="ombre" vers="roche" graine="accueil-pas-ceci" />
      <PasCeci connecte={connecte} />
      <Strates de="roche" vers="papier" graine="accueil-pied" />

      <Panneau surface="papier">
        <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
          <p className="text-mono text-stone-500">
            Kairn — un cairn balise un sentier, une pierre à la fois.
          </p>

          {/* Atteignables sans compte, et depuis la seule page publique : une
              politique de confidentialité derrière une connexion ne sert à
              personne. */}
          <nav className="gap-pas-4 text-mono flex flex-wrap">
            <Link
              href={ROUTES.mentionsLegales}
              className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              Mentions légales
            </Link>
            <Link
              href={ROUTES.confidentialite}
              className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              Confidentialité
            </Link>
          </nav>
        </div>
      </Panneau>
    </>
  );
}
