"use client";

import Link from "next/link";
import { PorteDeSortie } from "@/components/site/porte-de-sortie";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'appel à garder, dans le pied de la fenêtre de l'essai.
 *
 * **Il ne défile pas, et c'est tout l'intérêt de l'avoir sorti du corps.** Il
 * fermait la descente, sous les concepts et sous l'échantillon : à huit
 * concepts, sur un téléphone, la seule conversion de la page se trouvait à deux
 * écrans du pouce, après une liste qu'on vient précisément de donner envie de
 * lire. Un pied fixe le met sous la main à chaque instant, sans jamais couper
 * ce qu'on est en train de lire.
 *
 * **Le bouton est clair parce que le fond est sombre.** Un bouton plein vaut
 * `stone-900` sur `stone-50` ; posé sur la roche, il disparaîtrait dans son
 * propre fond. C'est la même figure retournée, pas un réglage de plus.
 *
 * **Le geste de sortie revient ici, et il s'empile au lieu de se serrer.** Il y
 * a tenu la droite une première fois, en `flex-wrap` sur une seule ligne : à
 * trois cent quatre-vingt-dix points, la mention du milieu se retrouvait coincée
 * dans une colonne de soixante pixels et tombait à un mot par ligne. Il est
 * alors parti au bas du corps, où il avait la place — mais où il flottait sous
 * l'échantillon, seul objet cliquable d'un bas de page qui n'appelait rien.
 *
 * Les deux défauts ont la même origine : trois choses sur une ligne de
 * téléphone. Le pied s'empile donc sur téléphone — le bouton prend la largeur,
 * la mention passe dessous, la sortie en dernier — et ne redevient une ligne
 * qu'à partir de `md`, où la sortie tient la droite sans serrer personne. Les
 * trois gestes qui ferment l'essai sont au même endroit, et c'est là qu'on les
 * cherche.
 *
 * **La mention a perdu sa clause du milieu.** Elle disait « Ton adresse suffit.
 * On te les repose au bon moment, et tu récupères ceux-ci. » — et le titre de la
 * fenêtre, trois lignes plus haut, dit déjà « Il te sera reposé seul, au moment
 * où tu allais l'oublier. » On promettait deux fois la même chose dans le même
 * écran, et c'est la seconde fois qui faisait passer le pied à trois lignes sur
 * un téléphone et à deux sur le bureau. Ce qu'il reste est ce que le titre ne
 * dit pas : ce qu'on demande, et ce qu'on garde.
 */
export function GarderLesConcepts({
  peutRedeposer,
  chaineFinie,
  surRedepot,
}: {
  /** La base n'accorde que deux essais par tranche de vingt-quatre heures. */
  peutRedeposer: boolean;
  /** L'extraction est allée au bout : avant, il n'y a rien à dire de la suite. */
  chaineFinie: boolean;
  surRedepot: () => void;
}) {
  return (
    <div className="gap-pas-2 md:gap-pas-4 flex flex-col md:flex-row md:items-center">
      <Button asChild size="lg" variant="clair" className="w-full md:w-auto">
        <Link href={ROUTES.connexion}>Les garder</Link>
      </Button>

      <span className="text-petit text-stone-300">
        Ton adresse suffit, et tu récupères ceux-ci.
      </span>

      <span className="md:ml-auto shrink-0 self-start md:self-auto">
        <PorteDeSortie
          peutRedeposer={peutRedeposer}
          chaineFinie={chaineFinie}
          surRedepot={surRedepot}
          clair
        />
      </span>
    </div>
  );
}
