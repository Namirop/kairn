"use client";

import { useCallback, useEffect, useRef } from "react";

type Point = { x: number; y: number };

/** Porte un coup de `depuis` vers `vers`, à la vitesse donnée. */
export type Frapper = (depuis: Point, vers: Point, vitesse: number) => void;

/** Au-delà, un geste est considéré comme un coup porté. */
const VITESSE_MINIMALE = 40;

/**
 * Vitesse d'un geste entre deux points du viewBox, ou `null` si elle reste sous
 * le seuil d'un coup. La durée est bornée par le bas : deux événements trop
 * rapprochés ne doivent pas donner une vitesse infinie.
 */
function vitesseDuCoup(depuis: Point, vers: Point, dureeMs: number): number | null {
  const dt = Math.max(dureeMs / 1000, 1 / 240);
  const vitesse = Math.hypot(vers.x - depuis.x, vers.y - depuis.y) / dt;

  return vitesse < VITESSE_MINIMALE ? null : vitesse;
}

/**
 * Capte les gestes portés au cairn — souris, stylet, appui et balayage au
 * doigt — et les transmet à `frapper`.
 */
export function useGestesSurLeCairn(actif: boolean, tenu: boolean, frapper: Frapper) {
  const refSvg = useRef<SVGSVGElement>(null);
  /**
   * La zone qui dit si un geste est parti du cairn. Elle est plus large que le
   * dessin : le geste qui fauche commence à côté des pierres. Voir la bande de
   * prise dans `CairnRenversable`.
   */
  const refZoneDeJeu = useRef<HTMLDivElement>(null);
  const posePrecedente = useRef<{ x: number; y: number; t: number } | null>(null);

  /** Point du geste, ramené dans le repère du viewBox. */
  const enCoordonneesLocales = useCallback((clientX: number, clientY: number) => {
    const svg = refSvg.current;
    const matrice = svg?.getScreenCTM();
    if (!svg || !matrice) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrice.inverse());
    return { x: point.x, y: point.y };
  }, []);

  /**
   * Le passage d'un pointeur au travers de l'empilement. À la souris, le survol
   * suffit ; un stylet doit appuyer. Le doigt est ignoré ici : le navigateur
   * annule le pointeur dès qu'il décide de défiler, avant que le doigt atteigne
   * une pierre. Le balayage tactile est écouté sur la fenêtre, plus bas.
   */
  const surDeplacement = useCallback(
    (evenement: React.PointerEvent<Element>) => {
      if (!actif) return;
      if (evenement.pointerType === "touch") return;
      if (evenement.pointerType !== "mouse" && evenement.buttons === 0) return;

      const point = enCoordonneesLocales(evenement.clientX, evenement.clientY);
      if (!point) return;

      const precedent = posePrecedente.current;
      const maintenant = evenement.timeStamp;
      posePrecedente.current = { ...point, t: maintenant };

      if (!precedent) return;

      const vitesse = vitesseDuCoup(precedent, point, maintenant - precedent.t);
      if (vitesse === null) return;

      frapper(precedent, point, vitesse);
    },
    [actif, enCoordonneesLocales, frapper],
  );

  /**
   * L'appui simple, au doigt. Un tapotement n'a pas de vitesse à donner : la
   * secousse est fixe, de quoi déséquilibrer sans faucher.
   */
  const surAppui = useCallback(
    (evenement: React.PointerEvent<Element>) => {
      if (!actif || evenement.pointerType === "mouse") return;

      const point = enCoordonneesLocales(evenement.clientX, evenement.clientY);
      if (point) frapper({ ...point, y: point.y - 1 }, point, 150);
    },
    [actif, enCoordonneesLocales, frapper],
  );

  const surSortie = useCallback(() => {
    posePrecedente.current = null;
  }, []);

  /**
   * Le balayage au doigt, écouté sur la fenêtre.
   *
   * Le navigateur annule le pointeur dès qu'il décide de défiler, alors que les
   * événements tactiles continuent d'être émis pendant le défilement : les
   * écouter, en passif, est le seul moyen de voir le geste sans bloquer le
   * défilement de la page d'ouverture.
   *
   * Un geste dont la part verticale l'emporte est un défilement et ne transmet
   * rien. Seule exception : la prise armée et un geste parti du cairn — la zone
   * porte alors `touch-action: none`, la page ne défile pas, et toutes les
   * directions valent.
   *
   * Les deux points sont projetés avec la matrice du moment : si la page a
   * défilé entre deux images, le décalage s'annule au lieu de s'ajouter au coup.
   */
  useEffect(() => {
    if (!actif) return;

    let precedent: { x: number; y: number; t: number } | null = null;
    /** Le geste en cours est-il parti du cairn, la prise armée. */
    let depuisLaPrise = false;

    const oublier = () => {
      precedent = null;
      depuisLaPrise = false;
    };

    const surDebut = (evenement: TouchEvent) => {
      const cible = evenement.target;
      depuisLaPrise =
        tenu && cible instanceof Node && (refZoneDeJeu.current?.contains(cible) ?? false);
      precedent = null;
    };

    const surBalayage = (evenement: TouchEvent) => {
      const doigt = evenement.touches[0];

      if (!doigt) return;

      const avant = precedent;

      precedent = { x: doigt.clientX, y: doigt.clientY, t: evenement.timeStamp };

      if (!avant) return;

      const dx = doigt.clientX - avant.x;
      const dy = doigt.clientY - avant.y;

      if (!depuisLaPrise && Math.abs(dx) <= Math.abs(dy)) return;

      const depuis = enCoordonneesLocales(avant.x, avant.y);
      const vers = enCoordonneesLocales(doigt.clientX, doigt.clientY);

      if (!depuis || !vers) return;

      const vitesse = vitesseDuCoup(depuis, vers, evenement.timeStamp - avant.t);
      if (vitesse === null) return;

      frapper(depuis, vers, vitesse);
    };

    window.addEventListener("touchstart", surDebut, { passive: true });
    window.addEventListener("touchmove", surBalayage, { passive: true });
    window.addEventListener("touchend", oublier, { passive: true });
    window.addEventListener("touchcancel", oublier, { passive: true });

    return () => {
      window.removeEventListener("touchstart", surDebut);
      window.removeEventListener("touchmove", surBalayage);
      window.removeEventListener("touchend", oublier);
      window.removeEventListener("touchcancel", oublier);
    };
  }, [actif, enCoordonneesLocales, frapper, tenu]);

  return { refSvg, refZoneDeJeu, surDeplacement, surAppui, surSortie };
}
