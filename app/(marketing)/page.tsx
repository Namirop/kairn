import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Essai } from "@/components/site/essai";
import { Hero } from "@/components/site/hero";
import { PasCeci } from "@/components/site/pas-ceci";
import { Reprendre } from "@/components/site/reprendre";
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
      {/* Le hero est identique quel que soit l'état. Ce qui change est le
          panneau qui le suit : l'essai pour un visiteur, un mot de reprise pour
          quelqu'un de connecté. Les deux vivent sur la même surface — le
          visiteur descend d'un cran sans changer de paroi, il descend juste
          plus près de l'action. */}
      <Hero connecte={connecte} />

      {/* Le hero se termine sur son sol d'ombre, et ce qui suit est du papier :
          c'est exactement ce qu'une coupe de roche sait faire. Peinte dans le
          panneau d'en dessous, la même transition venait couper le titre dès que
          la fenêtre raccourcissait. */}
      <Strates de="ombre" vers="papier" graine="accueil-essai" />

      {connecte ? (
        <Reprendre />
      ) : (
        <Essai invite={inviteDeDepot(Math.random())} essaiPrecedent={essaiPrecedent} />
      )}
      <Strates de="papier" vers="ombre" graine="accueil-sentier" />
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
