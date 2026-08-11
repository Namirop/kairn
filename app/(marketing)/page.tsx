import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Hero } from "@/components/site/hero";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";

/**
 * La page publique : une pile de panneaux, chacun avec sa surface, séparés par
 * des coupes de roche. On descend une paroi, on ne suit pas un article.
 *
 * Chaque jointure porte sa propre graine — les trois coupes ne se ressemblent
 * pas, et c'est ce qui les empêche de redevenir un séparateur de gabarit.
 */
export default function PageAccueil() {
  return (
    <>
      <Hero />
      <Strates de="papier" vers="ombre" graine="accueil-sentier" />
      <Sentier />
      <Strates de="ombre" vers="roche" graine="accueil-pas-ceci" />
      <PasCeci />
      <Strates de="roche" vers="papier" graine="accueil-pied" />

      <Panneau surface="papier">
        <p className="text-mono text-stone-500">
          Kairn — un cairn balise un sentier, une pierre à la fois.
        </p>
      </Panneau>
    </>
  );
}
