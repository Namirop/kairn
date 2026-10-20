"use client";

import { useCallback, useEffect, useRef } from "react";

type Point = { x: number; y: number };

/** Porte un coup de `depuis` vers `vers`, à la vitesse donnée. */
export type Frapper = (depuis: Point, vers: Point, vitesse: number) => void;

/** Au-delà, un geste est considéré comme un coup porté. */
const VITESSE_MINIMALE = 40;

/** `null` sous le seuil. Durée bornée : deux événements collés donneraient l'infini. */
function vitesseDuCoup(depuis: Point, vers: Point, dureeMs: number): number | null {
  const dt = Math.max(dureeMs / 1000, 1 / 240);
  const vitesse = Math.hypot(vers.x - depuis.x, vers.y - depuis.y) / dt;

  return vitesse < VITESSE_MINIMALE ? null : vitesse;
}

/** Souris, stylet, appui et balayage au doigt, transmis à `frapper`. */
export function useGestesSurLeCairn(actif: boolean, tenu: boolean, frapper: Frapper) {
  const refSvg = useRef<SVGSVGElement>(null);
  /** Plus large que le dessin : le geste qui fauche part d'à côté des pierres. */
  const refZoneDeJeu = useRef<HTMLDivElement>(null);
  const posePrecedente = useRef<{ x: number; y: number; t: number } | null>(null);

  const enCoordonneesLocales = useCallback((clientX: number, clientY: number) => {
    const svg = refSvg.current;
    const matrice = svg?.getScreenCTM();
    if (!svg || !matrice) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrice.inverse());
    return { x: point.x, y: point.y };
  }, []);

  /**
   * Souris au survol, stylet à l'appui. Le doigt passe par la fenêtre, plus
   * bas : le navigateur annule son pointeur dès qu'il décide de défiler.
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

  /** Un tapotement n'a pas de vitesse : secousse fixe, qui déséquilibre sans faucher. */
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
   * Le balayage au doigt. Les événements tactiles, eux, continuent pendant le
   * défilement : les écouter en passif voit le geste sans bloquer la page.
   *
   * Un geste surtout vertical est un défilement, sauf parti du cairn la prise
   * armée (`touch-action: none`, toutes directions). Les deux points sont
   * projetés avec la matrice du moment, pour que le défilement n'ajoute rien.
   */
  useEffect(() => {
    if (!actif) return;

    let precedent: { x: number; y: number; t: number } | null = null;
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
