import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sommets } from "./cairn-collision";
import {
  avancer,
  CADRE_LARGE,
  initialiser,
  renverser,
  toutEstPose,
  type Cadre,
  type Corps,
} from "./cairn-physique";
import { empiler, LARGEUR_VUE, type Pierre } from "./cairn-stack";

const EMPILEMENT = empiler(6);
const PIERRES = EMPILEMENT.pierres;

/** Fait tourner la simulation jusqu'au repos, ou jusqu'à la borne. */
function simuler(
  corps: Corps[],
  pierres: Pierre[] = PIERRES,
  pasMax = 900,
  cadre?: Cadre,
): Corps[] {
  let etat = corps;
  for (let i = 0; i < pasMax && !toutEstPose(etat); i += 1) {
    etat = avancer(etat, pierres, 1 / 60, cadre);
  }
  return etat;
}

/** Le point le plus bas d'une pierre, dans le repère où `y` croît vers le bas. */
function plusBasPoint(solide: Corps, pierre: Pierre): number {
  const points = sommets({
    x: solide.x,
    y: solide.y,
    rotation: solide.rotation,
    largeur: pierre.largeur,
    hauteur: pierre.hauteur,
  });

  return Math.max(...points.map((point) => point.y));
}

describe("initialiser", () => {
  it("pose chaque corps sur sa pierre, immobile", () => {
    const corps = initialiser(PIERRES);

    expect(corps).toHaveLength(PIERRES.length);
    expect(corps.every((c) => c.repos && !c.libre)).toBe(true);
    expect(corps.map((c) => c.x)).toEqual(PIERRES.map((p) => p.x));
  });
});

describe("renverser", () => {
  it("délivre la pierre visée et tout ce qu'elle portait", () => {
    const corps = renverser(initialiser(PIERRES), 2, { vx: 50, vy: 0 });

    expect(corps.slice(0, 2).every((c) => !c.libre)).toBe(true);
    expect(corps.slice(2).every((c) => c.libre && !c.repos)).toBe(true);
  });

  it("envoie tout du même côté que le geste", () => {
    const versLaDroite = renverser(initialiser(PIERRES), 1, { vx: 60, vy: 0 });
    const versLaGauche = renverser(initialiser(PIERRES), 1, { vx: -60, vy: 0 });

    expect(versLaDroite.slice(1).every((c) => c.vx > 0)).toBe(true);
    expect(versLaGauche.slice(1).every((c) => c.vx < 0)).toBe(true);
  });

  it("frappe le plus fort la pierre visée", () => {
    const corps = renverser(initialiser(PIERRES), 1, { vx: 60, vy: 0 });

    expect(corps[1]!.vx).toBeGreaterThan(corps[2]!.vx);
  });

  it("ne relance pas une pierre déjà libre", () => {
    const premier = renverser(initialiser(PIERRES), 2, { vx: 50, vy: 0 });
    const second = renverser(premier, 2, { vx: 50, vy: 0 });

    expect(second[2]!.vx).toBe(premier[2]!.vx);
  });
});

describe("avancer", () => {
  it("laisse une pierre intacte tant qu'elle n'est pas délogée", () => {
    const corps = initialiser(PIERRES);

    expect(avancer(corps, PIERRES, 1 / 60)).toEqual(corps);
  });

  it("finit toujours par tout poser", () => {
    const final = simuler(renverser(initialiser(PIERRES), 0, { vx: 30, vy: 0 }));

    expect(toutEstPose(final)).toBe(true);
    expect(final.every((c) => c.repos)).toBe(true);
  });

  it("garde toutes les pierres dans le cadre, même lancées fort", () => {
    const final = simuler(renverser(initialiser(PIERRES), 0, { vx: 400, vy: -200 }));

    for (const solide of final) {
      expect(solide.x).toBeGreaterThan(0);
      expect(solide.x).toBeLessThan(LARGEUR_VUE);
    }
  });

  it("laisse les pierres sortir du dessin quand le cadre est large", () => {
    const final = simuler(
      renverser(initialiser(PIERRES), 0, { vx: 600, vy: -120 }),
      PIERRES,
      900,
      CADRE_LARGE,
    );

    expect(final.some((solide) => solide.x > LARGEUR_VUE)).toBe(true);
    for (const solide of final) {
      expect(solide.x).toBeGreaterThan(CADRE_LARGE.gauche);
      expect(solide.x).toBeLessThan(CADRE_LARGE.droite);
    }
  });

  /**
   * Le sujet de tout le solveur de contacts. Sans lui, chaque pierre ne
   * connaissait que le sol : elles se traversaient et finissaient toutes à la
   * même hauteur, à cheval les unes sur les autres.
   */
  it("empile les pierres au lieu de les faire se traverser", () => {
    // Un coup mou et vertical : elles n'ont pas de quoi s'écarter, donc elles
    // ne peuvent finir qu'empilées.
    const final = simuler(renverser(initialiser(PIERRES), 0, { vx: 1, vy: 0 }));
    const hauteurs = final.map((solide, index) => -plusBasPoint(solide, PIERRES[index]!));

    // Au moins une pierre repose franchement au-dessus du sol : elle est donc
    // portée par une autre.
    expect(Math.max(...hauteurs)).toBeGreaterThan(4);
  });

  it("ne laisse aucune pierre posée traverser le socle resté debout", () => {
    // Coupé haut : les trois premières restent debout et font obstacle.
    const final = simuler(renverser(initialiser(PIERRES), 3, { vx: 20, vy: 0 }));
    const socle = PIERRES[2]!;
    const hautDuSocle = Math.min(
      ...sommets({ ...socle, x: socle.x, y: socle.y, rotation: socle.rotation }).map((p) => p.y),
    );

    for (const [index, solide] of final.entries()) {
      if (!solide.libre) continue;

      const bas = plusBasPoint(solide, PIERRES[index]!);
      const auDessus = bas < hautDuSocle + 1;
      const aCote = Math.abs(solide.x - socle.x) > socle.largeur / 2;

      expect(auDessus || aCote || bas <= 0.5).toBe(true);
    }
  });

  it("borne le pas de temps : un onglet qui reprend la main ne téléporte rien", () => {
    const depart = renverser(initialiser(PIERRES), 0, { vx: 20, vy: 0 });
    const unPas = avancer(depart, PIERRES, 1 / 30);
    const dixSecondes = avancer(depart, PIERRES, 10);

    expect(dixSecondes[0]!.y).toBeCloseTo(unPas[0]!.y, 5);
  });

  it("ignore un pas de temps négatif", () => {
    const depart = renverser(initialiser(PIERRES), 0, { vx: 20, vy: 0 });

    expect(avancer(depart, PIERRES, -5)).toEqual(depart);
  });
});

describe("propriété : la chute est déterministe et bornée", () => {
  it("le même geste donne toujours la même chute", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PIERRES.length - 1 }),
        fc.integer({ min: -300, max: 300 }),
        (index, vitesse) => {
          const geste = () =>
            simuler(renverser(initialiser(PIERRES), index, { vx: vitesse, vy: 0 }));

          expect(geste()).toEqual(geste());
        },
      ),
      { numRuns: 40 },
    );
  });

  it("tout finit posé, quels que soient la pierre visée et la force", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PIERRES.length - 1 }),
        fc.integer({ min: -600, max: 600 }),
        fc.integer({ min: -400, max: 400 }),
        (index, vx, vy) => {
          const final = simuler(renverser(initialiser(PIERRES), index, { vx, vy }));

          expect(toutEstPose(final)).toBe(true);
          for (const solide of final) {
            expect(Number.isFinite(solide.x)).toBe(true);
            expect(Number.isFinite(solide.y)).toBe(true);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  /**
   * La propriété qui manquait, et qui se voyait à l'écran : des pierres à
   * moitié enfoncées dans le sol.
   *
   * La tolérance n'est pas nulle, et ne peut pas l'être : un solveur à
   * impulsions laisse la gravité enfoncer d'un pas de temps avant de corriger,
   * et il tolère un jeu pour ne pas vibrer. Une demi-unité sur une pierre de
   * quinze, c'est trois pour cent de sa hauteur, sous des coins déjà arrondis.
   * Ce qu'on interdit ici, c'est l'enfoncement qui se voit — plusieurs unités,
   * ce que donnait l'ancien contact à la demi-hauteur.
   */
  const ENFONCEMENT_INVISIBLE = 0.5;

  it("aucune pierre ne s'enfonce dans le sol, quelle que soit son inclinaison", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PIERRES.length - 1 }),
        fc.integer({ min: -600, max: 600 }),
        fc.integer({ min: -400, max: 400 }),
        (index, vx, vy) => {
          const final = simuler(renverser(initialiser(PIERRES), index, { vx, vy }));

          final.forEach((solide, rang) => {
            if (!solide.libre) return;

            expect(plusBasPoint(solide, PIERRES[rang]!)).toBeLessThanOrEqual(ENFONCEMENT_INVISIBLE);
          });
        },
      ),
      { numRuns: 60 },
    );
  });
});
