"use client";

import { useEffect, useRef } from "react";

/**
 * Amène un élément à l'écran au moment où il apparaît, et seulement s'il en a
 * besoin.
 *
 * **Le geste manquait au moment le plus important d'une question.** On demande à
 * voir la réponse ; elle s'affiche sous le bouton, donc sous le pli sur un
 * téléphone, et rien ne bouge. On lit une carte qui n'a pas changé, on se
 * demande si le clic a pris, puis on descend soi-même. Le seul moment où l'écran
 * a quelque chose à dire est celui où il ne le montre pas.
 *
 * `block: "nearest"` fait exactement ce qu'il faut : rien du tout quand
 * l'élément est déjà entièrement visible — le cas d'un grand écran, où un
 * déplacement serait gratuit et désagréable — et le minimum nécessaire sinon. On
 * ne recentre pas : la question doit rester lisible au-dessus de sa réponse.
 *
 * Le mouvement suit `prefers-reduced-motion`, comme partout : la même
 * destination, sans le trajet.
 */
export function useVenirEnVue<T extends HTMLElement>(actif = true) {
  const cible = useRef<T>(null);

  useEffect(() => {
    const element = cible.current;

    if (!actif || !element) return;

    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    element.scrollIntoView({ behavior: immobile ? "auto" : "smooth", block: "nearest" });
  }, [actif]);

  return cible;
}
