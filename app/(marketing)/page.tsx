import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Hero } from "@/components/site/hero";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";
import { ROUTES } from "@/lib/auth/routes";
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

export default function PageAccueil() {
  return (
    <>
      <Hero invite={inviteDeDepot(Math.random())} />
      <Strates de="papier" vers="ombre" graine="accueil-sentier" />
      <Sentier />
      <Strates de="ombre" vers="roche" graine="accueil-pas-ceci" />
      <PasCeci />
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
