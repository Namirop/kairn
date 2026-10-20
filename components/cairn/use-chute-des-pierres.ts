"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  avancer,
  cairnRenverse,
  CADRE_SERRE,
  initialiser,
  renverser,
  toutEstPose,
  type Cadre,
  type Corps,
} from "@/lib/domain/cairn-physique";
import { remonter } from "@/lib/domain/cairn-remontee";
import { pierreTraversee } from "@/lib/domain/cairn-contact";
import type { Pierre } from "@/lib/domain/cairn-empilement";
import { useGestesSurLeCairn } from "@/components/cairn/use-gestes-sur-le-cairn";

/**
 * La boucle écrit `transform` directement : soixante images par seconde dans
 * l'état de React re-rendraient l'arbre pour six chemins. Elle s'arrête quand
 * rien ne bouge.
 */

/** En millisecondes. */
const AVANT_REMONTEE = 1600;
/** En ms : un solveur à impulsions peut osciller sans fin (pierre sur une arête). */
const CHUTE_MAXIMALE = 9000;
/** Haut à dessein : un geste franc doit pouvoir envoyer les pierres hors du cadre. */
const VITESSE_MAXIMALE = 640;

type Phase = "pose" | "chute" | "attente" | "remontee";

export function useChuteDesPierres(
  pierres: Pierre[],
  actif: boolean,
  /** `tenu` : la prise est armée, les gestes partis du cairn lui appartiennent. */
  { cadre = CADRE_SERRE, tenu = false }: { cadre?: Cadre; tenu?: boolean } = {},
) {
  const refsGroupes = useRef<(SVGGElement | null)[]>([]);
  // Premier rendu seulement : l'effet réinitialise à chaque nouvel empilement.
  const [corpsDeDepart] = useState(() => initialiser(pierres));
  const corps = useRef<Corps[]>(corpsDeDepart);
  const phase = useRef<Phase>("pose");
  const boucle = useRef<number | null>(null);
  const posee = useRef(0);
  const debutChute = useRef(0);

  const peindre = useCallback(() => {
    corps.current.forEach((solide, index) => {
      refsGroupes.current[index]?.setAttribute(
        "transform",
        `translate(${solide.x.toFixed(2)} ${solide.y.toFixed(2)}) rotate(${solide.rotation.toFixed(2)})`,
      );
    });
  }, []);

  // `function` et non une constante : elle se rappelle sans être lue avant d'exister.
  const tourner = useCallback(
    (depart: number) => {
      function image(precedent: number) {
        return (instant: number) => {
          const dt = (instant - precedent) / 1000;

          if (phase.current === "chute") {
            corps.current = avancer(corps.current, pierres, dt, cadre);
            if (toutEstPose(corps.current) || instant - debutChute.current > CHUTE_MAXIMALE) {
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

          boucle.current = requestAnimationFrame(image(instant));
        };
      }

      return image(depart);
    },
    [cadre, peindre, pierres],
  );

  const relancer = useCallback(() => {
    if (boucle.current !== null) return;
    boucle.current = requestAnimationFrame(tourner(performance.now()));
  }, [tourner]);

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
      if (phase.current !== "chute") debutChute.current = performance.now();
      phase.current = "chute";
      relancer();
    },
    [pierres, relancer],
  );

  const { refSvg, refZoneDeJeu, surDeplacement, surAppui, surSortie } = useGestesSurLeCairn(
    actif,
    tenu,
    frapper,
  );

  useEffect(() => {
    corps.current = initialiser(pierres);
    phase.current = "pose";
    peindre();

    return () => {
      if (boucle.current !== null) cancelAnimationFrame(boucle.current);
      boucle.current = null;
    };
  }, [pierres, peindre]);

  return { refSvg, refZoneDeJeu, refsGroupes, surDeplacement, surAppui, surSortie };
}
