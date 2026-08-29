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
   * **Le doigt ne passe plus par ici.** Le navigateur annule le pointeur dès
   * qu'il décide de défiler, et il le décide avant que le doigt ait atteint une
   * pierre : ce chemin-là ne pouvait servir qu'en lui interdisant le
   * défilement, ce qui coûtait plus cher que l'effet ne vaut. Le balayage
   * tactile est écouté sur la fenêtre, plus bas.
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
   * **Pourquoi la fenêtre, et pas le cairn.** `touch-action` se lit sur ce que
   * le doigt touche en premier, et le geste qui fauche un empilement part à côté
   * de lui. Le temps d'y arriver, le navigateur a décidé de défiler et annulé le
   * pointeur : rien ne remonte plus. On peut le lui interdire — c'est ce qu'on a
   * essayé —, mais ça fait de la bande une zone où la page ne défile plus, sur
   * l'écran d'ouverture. Un easter egg ne vaut pas ce prix-là.
   *
   * Les événements **tactiles**, eux, continuent d'être émis pendant que la page
   * défile. En écouter est donc le seul moyen de voir le geste sans en réclamer
   * la propriété. L'écoute est passive : on n'empêche jamais rien, on regarde.
   *
   * **Un défilement est vertical, un balayage est horizontal.** C'est le seul
   * discriminant nécessaire, et il est catégorique : tout geste dont la part
   * verticale l'emporte appartient à la page et ne transmet rien. Personne ne
   * fauche un cairn de haut en bas.
   *
   * Les deux points sont projetés avec la matrice **du moment**. Si la page a
   * défilé entre les deux images, le cairn a bougé sous le doigt : projeter le
   * point d'avant avec la matrice d'avant ajouterait ce décalage au coup. Avec
   * celle du moment, il s'annule, et il ne reste que le geste.
   */
  useEffect(() => {
    if (!actif) return;

    let precedent: { x: number; y: number; t: number } | null = null;
    const oublier = () => {
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

      if (Math.abs(dx) <= Math.abs(dy)) return;

      const depuis = enCoordonneesLocales(avant.x, avant.y);
      const vers = enCoordonneesLocales(doigt.clientX, doigt.clientY);

      if (!depuis || !vers) return;

      const dt = Math.max((evenement.timeStamp - avant.t) / 1000, 1 / 240);
      const vitesse = Math.hypot(vers.x - depuis.x, vers.y - depuis.y) / dt;

      if (vitesse < VITESSE_MINIMALE) return;

      frapper(depuis, vers, vitesse);
    };

    window.addEventListener("touchmove", surBalayage, { passive: true });
    window.addEventListener("touchend", oublier, { passive: true });
    window.addEventListener("touchcancel", oublier, { passive: true });

    return () => {
      window.removeEventListener("touchmove", surBalayage);
      window.removeEventListener("touchend", oublier);
      window.removeEventListener("touchcancel", oublier);
    };
  }, [actif, enCoordonneesLocales, frapper]);

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
