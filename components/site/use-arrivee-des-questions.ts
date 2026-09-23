"use client";

import { useEffect, useRef } from "react";

/**
 * Amener les questions sous les yeux à l'instant où elles arrivent.
 *
 * L'essai se joue en deux temps : les concepts paraissent d'abord, l'écriture
 * des questions suit. Pendant le second temps, on lit les concepts — donc on est
 * en haut de la fenêtre —, et la seule chose qui bougeait à l'arrivée du lot
 * était un bloc situé sous le pli. La démonstration s'achevait hors de vue, et
 * rien ne disait qu'elle s'était achevée : on restait sur les concepts en
 * croyant que ça tournait encore.
 *
 * Le défilement n'a donc rien d'un confort, c'est ce qui rend l'événement
 * visible. Il vise le haut du second temps, à un pas du bord — `scroll-mt` sur
 * la cible, que `scrollIntoView` respecte.
 *
 * **Il ne se déclenche qu'à la transition, jamais à l'ouverture.** Rouvrir un
 * essai déjà abouti passe par ici avec ses questions déjà là : sauter aux
 * questions volerait alors les concepts à quelqu'un qui vient de demander à les
 * revoir. C'est le passage de zéro à quelque chose qui déclenche, et lui seul.
 *
 * Il suit `prefers-reduced-motion` : un saut au lieu d'un glissement, jamais
 * rien au lieu des deux — la position doit changer dans tous les cas, c'est
 * l'information.
 */
export function useArriveeDesQuestions(combien: number) {
  const ancre = useRef<HTMLElement>(null);
  const precedent = useRef(combien);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = combien;

    if (avant > 0 || combien === 0) return;

    const cible = ancre.current;
    if (!cible) return;

    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cible.scrollIntoView({ block: "start", behavior: immobile ? "auto" : "smooth" });
  }, [combien]);

  return ancre;
}
