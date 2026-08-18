"use client";

import { useCallback, useEffect, useRef } from "react";
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
/**
 * Durée maximale d'une chute, en millisecondes.
 *
 * Un solveur à impulsions a des configurations sans fin : une pierre debout en
 * équilibre sur l'arête d'une autre peut osciller indéfiniment sans jamais
 * franchir le seuil de repos. Le balayage exhaustif n'en trouve plus une seule,
 * mais « plus une seule aujourd'hui » n'est pas une garantie, et le prix d'une
 * boucle d'animation qui ne s'arrête jamais est trop élevé pour se contenter
 * d'un réglage bien choisi. Passé ce délai, la chute est déclarée finie et le
 * cairn se reconstruit.
 */
const CHUTE_MAXIMALE = 9000;
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
  const debutChute = useRef(0);

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
      if (phase.current !== "chute") debutChute.current = performance.now();
      phase.current = "chute";
      relancer();
    },
    [pierres, relancer],
  );

  /**
   * Le passage d'un pointeur au travers de l'empilement.
   *
   * À la souris, le survol suffit — il n'y a rien d'autre qu'un survol puisse
   * vouloir dire ici. Au doigt, il faut appuyer : sans ça, le moindre défilement
   * de la page aurait fauché le cairn en passant.
   *
   * Le doigt était exclu tout court, et le tapotement tenait lieu de geste. Il
   * fait tomber, mais il ne fait que ça : on ne peut ni balayer la pile, ni
   * choisir la pierre qu'on vise, ni doser. Le glissé rend au tactile ce que la
   * souris avait — c'est le `touch-action` de l'élément qui garde le défilement
   * vertical à la page, et laisse l'horizontale au cairn.
   */
  const surDeplacement = useCallback(
    (evenement: React.PointerEvent<SVGSVGElement>) => {
      if (!actif) return;
      if (evenement.pointerType !== "mouse" && evenement.buttons === 0) return;

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

  /**
   * L'appui simple, au doigt.
   *
   * Il reste, à côté du glissé : un tapotement est ce qu'on essaie en premier,
   * et il n'a pas de vitesse à donner. La secousse est donc fixe, et de quoi
   * déséquilibrer sans faucher.
   */
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
