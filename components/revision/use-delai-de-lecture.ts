"use client";

import { useEffect, useState } from "react";

/**
 * Le temps qu'on laisse à une réponse qu'on n'avait pas.
 *
 * Sur un format à choix, la main est déjà sur la souris quand la correction
 * s'affiche : le geste suivant part avant que l'œil ait rien lu, et la seule
 * chose qu'un échec avait à apprendre passe à la trappe. Le bouton attend donc,
 * et cette attente est la moitié de l'intérêt du format.
 *
 * **Elle ne s'applique qu'à ce qu'on ne savait pas.** Une bonne réponse n'a rien
 * à faire lire : retenir quelqu'un devant sa propre réussite serait une punition
 * pour avoir eu juste, et le rythme d'une session tient à ce que les bonnes
 * réponses s'enchaînent. Le passage, lui, est déjà écrit dans les deux cas —
 * l'attente ne retient rien, elle ne fait que retarder l'affichage du suivant.
 */

/** Assez pour lire deux lignes, trop peu pour qu'on aille voir ailleurs. */
export const DELAI_DE_LECTURE_MS = 3000;

/**
 * `false` tant que le délai court, `true` ensuite. Rend `true` d'emblée quand il
 * n'y a rien à lire.
 */
export function useDelaiDeLecture(aLire: boolean): boolean {
  const [lu, setLu] = useState(!aLire);

  useEffect(() => {
    if (!aLire) {
      setLu(true);
      return;
    }

    setLu(false);
    const minuteur = setTimeout(() => setLu(true), DELAI_DE_LECTURE_MS);

    return () => clearTimeout(minuteur);
  }, [aLire]);

  return lu;
}
