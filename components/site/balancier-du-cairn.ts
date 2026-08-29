import { type RefObject, useEffect, useRef } from "react";
import { LARGEUR_VUE, type Pierre } from "@/lib/domain/cairn-stack";
import { periodeDuRang, positionDuBalancier } from "@/lib/domain/jeu-du-cairn";

/** Les bords que le balancier ne franchit pas, en unités de la vue. */
const MARGE = 2;

/**
 * La pierre qui va et vient au-dessus de la pile, et l'abscisse où elle se
 * trouve à l'instant où l'on appuie.
 *
 * **Elle bouge sans repasser par React.** Soixante rendus par seconde pour
 * déplacer un attribut, c'est soixante fois le travail de réconciliation de tout
 * ce qui est autour — la liste des concepts, la carte de question — pour un
 * `translate`. L'abscisse vit donc dans une référence que la pose vient lire, et
 * la boucle écrit directement sur le nœud.
 *
 * `enVol` absent arrête la boucle : c'est ce qui immobilise le jeu quand la pile
 * est finie ou qu'elle vient de tomber.
 */
export function useBalancier(
  enVol: Pierre | undefined,
  rang: number,
  total: number,
  immobile: boolean,
): { balancier: RefObject<SVGGElement | null>; x: RefObject<number> } {
  const balancier = useRef<SVGGElement>(null);
  const x = useRef(LARGEUR_VUE / 2);

  useEffect(() => {
    if (immobile || !enVol) return;

    const bord = enVol.largeur / 2 + MARGE;
    const [min, max] = [bord, LARGEUR_VUE - bord];
    const periode = periodeDuRang(rang, total);
    const depart = performance.now();
    let image = 0;

    const avancer = (maintenant: number) => {
      x.current = positionDuBalancier(maintenant - depart, periode, min, max);
      balancier.current?.setAttribute("transform", `translate(${x.current.toFixed(2)} ${enVol.y})`);
      image = requestAnimationFrame(avancer);
    };

    image = requestAnimationFrame(avancer);

    return () => cancelAnimationFrame(image);
  }, [immobile, enVol, rang, total]);

  return { balancier, x };
}
