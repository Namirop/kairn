"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  avancer,
  cairnRenverse,
  CADRE_SERRE,
  initialiser,
  remonter,
  renverser,
  toutEstPose,
  type Cadre,
  type Corps,
} from "@/lib/domain/cairn-physique";
import { pierreTraversee } from "@/lib/domain/cairn-contact";
import type { Pierre } from "@/lib/domain/cairn-stack";

/**
 * Pilote la chute des pierres.
 *
 * La boucle écrit directement l'attribut `transform` de chaque groupe : passer
 * soixante images par seconde dans l'état de React ferait re-rendre tout
 * l'arbre pour déplacer six chemins. Elle s'arrête d'elle-même dès que plus
 * rien ne bouge — aucune image d'animation n'est consommée au repos.
 */

/** Temps d'arrêt avant que le cairn ne se reconstruise, en millisecondes. */
const AVANT_REMONTEE = 1600;
/** Au-delà, un geste est considéré comme un coup porté. */
const VITESSE_MINIMALE = 40;
/**
 * Plafond de la force transmise.
 *
 * Il était calé sur la largeur du dessin : au-delà, les pierres n'avaient nulle
 * part où aller. Maintenant qu'elles peuvent sortir du cadre, un geste franc
 * doit pouvoir les envoyer loin — c'est toute la différence entre effleurer un
 * empilement et le faucher.
 */
const VITESSE_MAXIMALE = 640;

type Phase = "pose" | "chute" | "attente" | "remontee";

export function useChuteDesPierres(pierres: Pierre[], actif: boolean, cadre: Cadre = CADRE_SERRE) {
  const refSvg = useRef<SVGSVGElement>(null);
  const refsGroupes = useRef<(SVGGElement | null)[]>([]);
  const corps = useRef<Corps[]>(initialiser(pierres));
  const phase = useRef<Phase>("pose");
  const posePrecedente = useRef<{ x: number; y: number; t: number } | null>(null);
  const boucle = useRef<number | null>(null);
  const posee = useRef(0);

  const peindre = useCallback(() => {
    corps.current.forEach((solide, index) => {
      refsGroupes.current[index]?.setAttribute(
        "transform",
        `translate(${solide.x.toFixed(2)} ${solide.y.toFixed(2)}) rotate(${solide.rotation.toFixed(2)})`,
      );
    });
  }, []);

  const tourner = useCallback(
    (precedent: number) => (instant: number) => {
      const dt = (instant - precedent) / 1000;

      if (phase.current === "chute") {
        corps.current = avancer(corps.current, pierres, dt, cadre);
        if (toutEstPose(corps.current)) {
          phase.current = "attente";
          posee.current = instant;
        }
      } else if (phase.current === "attente" && instant - posee.current > AVANT_REMONTEE) {
        phase.current = "remontee";
      } else if (phase.current === "remontee") {
        corps.current = remonter(corps.current, pierres, dt);
        if (!cairnRenverse(corps.current)) phase.current = "pose";
      }

      peindre();

      if (phase.current === "pose") {
        boucle.current = null;
        return;
      }

      boucle.current = requestAnimationFrame(tourner(instant));
    },
    [cadre, peindre, pierres],
  );

  const relancer = useCallback(() => {
    if (boucle.current !== null) return;
    boucle.current = requestAnimationFrame(tourner(performance.now()));
  }, [tourner]);

  /** Point du geste, ramené dans le repère du viewBox. */
  const enCoordonneesLocales = useCallback((clientX: number, clientY: number) => {
    const svg = refSvg.current;
    const matrice = svg?.getScreenCTM();
    if (!svg || !matrice) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrice.inverse());
    return { x: point.x, y: point.y };
  }, []);

  const frapper = useCallback(
    (depuis: { x: number; y: number }, vers: { x: number; y: number }, vitesse: number) => {
      const index = pierreTraversee(corps.current, pierres, depuis, vers);
      if (index === null) return;

      const longueur = Math.hypot(vers.x - depuis.x, vers.y - depuis.y) || 1;
      const force = Math.min(vitesse, VITESSE_MAXIMALE);

      corps.current = renverser(corps.current, index, {
        vx: ((vers.x - depuis.x) / longueur) * force,
        vy: ((vers.y - depuis.y) / longueur) * force * 0.4,
      });
      phase.current = "chute";
      relancer();
    },
    [pierres, relancer],
  );

  const surDeplacement = useCallback(
    (evenement: React.PointerEvent<SVGSVGElement>) => {
      if (!actif || evenement.pointerType !== "mouse") return;

      const point = enCoordonneesLocales(evenement.clientX, evenement.clientY);
      if (!point) return;

      const precedent = posePrecedente.current;
      const maintenant = evenement.timeStamp;
      posePrecedente.current = { ...point, t: maintenant };

      if (!precedent) return;

      const dt = Math.max((maintenant - precedent.t) / 1000, 1 / 240);
      const vitesse = Math.hypot(point.x - precedent.x, point.y - precedent.y) / dt;

      if (vitesse < VITESSE_MINIMALE) return;

      frapper(precedent, point, vitesse);
    },
    [actif, enCoordonneesLocales, frapper],
  );

  /** Au doigt, le geste sert à faire défiler : c'est l'appui qui fait tomber. */
  const surAppui = useCallback(
    (evenement: React.PointerEvent<SVGSVGElement>) => {
      if (!actif || evenement.pointerType === "mouse") return;

      const point = enCoordonneesLocales(evenement.clientX, evenement.clientY);
      if (point) frapper({ ...point, y: point.y - 1 }, point, 150);
    },
    [actif, enCoordonneesLocales, frapper],
  );

  const surSortie = useCallback(() => {
    posePrecedente.current = null;
  }, []);

  useEffect(() => {
    corps.current = initialiser(pierres);
    phase.current = "pose";
    peindre();

    return () => {
      if (boucle.current !== null) cancelAnimationFrame(boucle.current);
      boucle.current = null;
    };
  }, [pierres, peindre]);

  return { refSvg, refsGroupes, surDeplacement, surAppui, surSortie };
}
