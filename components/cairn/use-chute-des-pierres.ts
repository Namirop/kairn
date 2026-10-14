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
 * Durée maximale d'une chute, en millisecondes. Un solveur à impulsions peut
 * osciller sans jamais atteindre le repos (une pierre en équilibre sur une
 * arête) : ce délai garantit que la boucle d'animation s'arrête.
 */
const CHUTE_MAXIMALE = 9000;
/** Au-delà, un geste est considéré comme un coup porté. */
const VITESSE_MINIMALE = 40;
/**
 * Plafond de la force transmise. Les pierres peuvent sortir du cadre : un geste
 * franc doit pouvoir les envoyer loin.
 */
const VITESSE_MAXIMALE = 640;

type Phase = "pose" | "chute" | "attente" | "remontee";

export function useChuteDesPierres(
  pierres: Pierre[],
  actif: boolean,
  /** `tenu` : la prise est armée, les gestes partis du cairn lui appartiennent. */
  { cadre = CADRE_SERRE, tenu = false }: { cadre?: Cadre; tenu?: boolean } = {},
) {
  const refSvg = useRef<SVGSVGElement>(null);
  /**
   * La zone qui dit si un geste est parti du cairn. Elle est plus large que le
   * dessin : le geste qui fauche commence à côté des pierres. Voir la bande de
   * prise dans `CairnRenversable`.
   */
  const refZoneDeJeu = useRef<HTMLDivElement>(null);
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

      const dt = Math.max((maintenant - precedent.t) / 1000, 1 / 240);
      const vitesse = Math.hypot(point.x - precedent.x, point.y - precedent.y) / dt;

      if (vitesse < VITESSE_MINIMALE) return;

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

      const dt = Math.max((evenement.timeStamp - avant.t) / 1000, 1 / 240);
      const vitesse = Math.hypot(vers.x - depuis.x, vers.y - depuis.y) / dt;

      if (vitesse < VITESSE_MINIMALE) return;

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
