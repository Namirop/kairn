import Link from "next/link";
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
 * **Il n'y a que deux choses ici, et il y en avait trois.** « Déposer autre
 * chose » y tenait la droite : à trois cent quatre-vingt-dix points, la mention
 * du milieu se retrouvait serrée dans une colonne de soixante pixels et tombait
 * à un mot par ligne. Le geste de sortie est parti au bas du corps, où il a la
 * place — et où il cesse de disputer sa ligne à l'appel qu'on cherche à
 * provoquer.
 *
 * **Il s'empile sur téléphone.** Le bouton prend la largeur, la mention passe
 * dessous : sur un pied qui ne défile pas, une ligne qui se casse mal coûte la
 * moitié de la hauteur de la feuille.
 */
export function GarderLesConcepts() {
  return (
    <div className="gap-pas-2 md:gap-pas-4 flex flex-col md:flex-row md:items-center">
      <Button asChild size="lg" variant="clair" className="w-full md:w-auto">
        <Link href={ROUTES.connexion}>Les garder</Link>
      </Button>

      <span className="text-petit text-stone-300">
        Ton adresse suffit. On te les repose au bon moment, et tu récupères ceux-ci.
      </span>
    </div>
  );
}
