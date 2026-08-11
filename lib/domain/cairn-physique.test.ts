import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  avancer,
  CADRE_LARGE,
  cairnRenverse,
  demiEmprise,
  initialiser,
  remonter,
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
  pasMax = 600,
  cadre?: Cadre,
): Corps[] {
  let etat = corps;
  for (let i = 0; i < pasMax && !toutEstPose(etat); i += 1) {
    etat = avancer(etat, pierres, 1 / 60, cadre);
  }
  return etat;
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

  it("finit toujours par tout poser au sol", () => {
    const final = simuler(renverser(initialiser(PIERRES), 0, { vx: 30, vy: 0 }));

    expect(toutEstPose(final)).toBe(true);
    expect(final.every((c) => c.repos)).toBe(true);
  });

  it("pose chaque pierre sur son encombrement incliné, jamais dans le sol", () => {
    const final = simuler(renverser(initialiser(PIERRES), 0, { vx: 30, vy: 0 }));

    final.forEach((solide, index) => {
      expect(solide.y).toBeCloseTo(-demiEmprise(PIERRES[index]!, solide.rotation).y, 5);
    });
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
      600,
      CADRE_LARGE,
    );

    expect(final.some((solide) => solide.x > LARGEUR_VUE)).toBe(true);
    for (const solide of final) {
      expect(solide.x).toBeGreaterThan(CADRE_LARGE.gauche);
      expect(solide.x).toBeLessThan(CADRE_LARGE.droite);
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

describe("remonter", () => {
  it("ramène les pierres à leur place et les remet au repos", () => {
    let corps = simuler(renverser(initialiser(PIERRES), 0, { vx: 60, vy: 0 }));

    for (let i = 0; i < 400 && cairnRenverse(corps); i += 1) {
      corps = remonter(corps, PIERRES, 1 / 60);
    }

    expect(cairnRenverse(corps)).toBe(false);
    expect(corps).toEqual(initialiser(PIERRES));
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
      { numRuns: 60 },
    );
  });

  it("tout finit posé au sol, quels que soient la pierre visée et la force", () => {
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
            expect(solide.y).toBeLessThanOrEqual(0);
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  /**
   * La propriété qui manquait, et qui se voyait à l'écran : des pierres à
   * moitié enfoncées dans le sol. Aucun point d'une pierre au repos ne passe
   * sous le sol, quelle que soit l'inclinaison où elle a fini.
   */
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

            expect(solide.y + demiEmprise(PIERRES[rang]!, solide.rotation).y).toBeLessThanOrEqual(
              1e-9,
            );
          });
        },
      ),
      { numRuns: 120 },
    );
  });
});

describe("demiEmprise", () => {
  it("rend la demi-hauteur et la demi-largeur d'une pierre à plat", () => {
    const pierre = PIERRES[0]!;

    expect(demiEmprise(pierre, 0).y).toBeCloseTo(pierre.hauteur / 2, 10);
    expect(demiEmprise(pierre, 0).x).toBeCloseTo(pierre.largeur / 2, 10);
  });

  it("échange les deux axes sur une pierre couchée", () => {
    const pierre = PIERRES[0]!;

    expect(demiEmprise(pierre, 90).y).toBeCloseTo(pierre.largeur / 2, 10);
    expect(demiEmprise(pierre, 90).x).toBeCloseTo(pierre.hauteur / 2, 10);
  });

  it("ne descend jamais sous l'encombrement à plat", () => {
    fc.assert(
      fc.property(fc.integer({ min: -720, max: 720 }), (rotation) => {
        const pierre = PIERRES[0]!;
        const demi = demiEmprise(pierre, rotation);

        expect(demi.y).toBeGreaterThanOrEqual(Math.min(pierre.hauteur, pierre.largeur) / 2 - 1e-9);
        expect(demi.x).toBeGreaterThanOrEqual(Math.min(pierre.hauteur, pierre.largeur) / 2 - 1e-9);
      }),
      { numRuns: 100 },
    );
  });
});
