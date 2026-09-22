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
 * Le second geste est discret et il le reste. C'est une porte de sortie posée
 * juste sous l'appel qu'on cherche à provoquer : lui donner le même poids
 * reviendrait à proposer de recommencer à quelqu'un qu'on vient de convaincre.
 * Il ne s'affiche que lorsque la base l'accorde vraiment — deux essais par
 * tranche de vingt-quatre heures —, faute de quoi on proposerait un geste que le
 * serveur refuserait à l'arrivée.
 */
export function GarderLesConcepts({
  peutRedeposer,
  surRedepot,
}: {
  peutRedeposer: boolean;
  surRedepot: () => void;
}) {
  return (
    <div className="gap-pas-3 md:gap-pas-4 flex flex-wrap items-center">
      <Button asChild size="lg" variant="clair">
        <Link href={ROUTES.connexion}>Les garder</Link>
      </Button>

      <span className="text-petit min-w-0 flex-1 text-stone-300">
        Ton adresse suffit. On te les repose au bon moment, et tu récupères ceux-ci.
      </span>

      {peutRedeposer ? (
        <Button type="button" variant="linkClair" size="sm" className="px-0" onClick={surRedepot}>
          Déposer autre chose
        </Button>
      ) : null}
    </div>
  );
}
