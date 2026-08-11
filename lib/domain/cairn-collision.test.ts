import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  contactsAvecLeCadre,
  contactsAvecLeSol,
  contactsEntre,
  contient,
  sommets,
  type Boite,
} from "./cairn-collision";

function boite(reglages: Partial<Boite> = {}): Boite {
  return { x: 0, y: 0, rotation: 0, largeur: 40, hauteur: 10, ...reglages };
}

describe("sommets", () => {
  it("rend les quatre coins d'une boîte à plat", () => {
    const points = sommets(boite());

    expect(points).toHaveLength(4);
    expect(points.map((point) => point.x).sort((a, b) => a - b)).toEqual([-20, -20, 20, 20]);
    expect(points.map((point) => point.y).sort((a, b) => a - b)).toEqual([-5, -5, 5, 5]);
  });

  it("échange les deux axes à quatre-vingt-dix degrés", () => {
    const points = sommets(boite({ rotation: 90 }));

    for (const point of points) {
      expect(Math.abs(point.x)).toBeCloseTo(5, 8);
      expect(Math.abs(point.y)).toBeCloseTo(20, 8);
    }
  });

  it("garde le centre de gravité au centre, quelle que soit la rotation", () => {
    fc.assert(
      fc.property(fc.integer({ min: -360, max: 360 }), (rotation) => {
        const points = sommets(boite({ x: 7, y: -3, rotation }));
        const moyenne = points.reduce(
          (somme, point) => ({ x: somme.x + point.x / 4, y: somme.y + point.y / 4 }),
          { x: 0, y: 0 },
        );

        expect(moyenne.x).toBeCloseTo(7, 8);
        expect(moyenne.y).toBeCloseTo(-3, 8);
      }),
      { numRuns: 80 },
    );
  });
});

describe("contient", () => {
  it("prend le centre, refuse le lointain", () => {
    expect(contient(boite(), { x: 0, y: 0 })).toBe(true);
    expect(contient(boite(), { x: 100, y: 0 })).toBe(false);
  });

  it("tient compte de la rotation", () => {
    const debout = boite({ rotation: 90 });

    expect(contient(debout, { x: 0, y: 15 })).toBe(true);
    expect(contient(debout, { x: 15, y: 0 })).toBe(false);
  });

  it("prend tous les sommets d'une boîte, à la précision près", () => {
    fc.assert(
      fc.property(fc.integer({ min: -180, max: 180 }), (rotation) => {
        const cible = boite({ rotation });

        for (const sommet of sommets(cible)) {
          const versLeCentre = {
            x: sommet.x + (cible.x - sommet.x) * 0.001,
            y: sommet.y + (cible.y - sommet.y) * 0.001,
          };

          expect(contient(cible, versLeCentre)).toBe(true);
        }
      }),
      { numRuns: 80 },
    );
  });
});

describe("contactsEntre", () => {
  it("ne rend rien quand les pierres ne se touchent pas", () => {
    expect(contactsEntre(boite(), boite({ x: 100 }))).toEqual([]);
    expect(contactsEntre(boite(), boite({ y: -40 }))).toEqual([]);
  });

  it("rend deux appuis quand une pierre repose à plat sur une autre", () => {
    // Neuf unités d'écart pour dix de hauteur : un chevauchement d'une unité.
    const dessus = boite({ y: -9 });
    const contacts = contactsEntre(boite(), dessus);

    expect(contacts).toHaveLength(2);
    for (const contact of contacts) {
      expect(contact.penetration).toBeCloseTo(1, 6);
      // Le dessus doit être repoussé vers le haut, donc vers les y négatifs.
      expect(contact.normale.y).toBeCloseTo(-1, 6);
      expect(contact.normale.x).toBeCloseTo(0, 6);
    }
  });

  it("oriente toujours la normale de la première vers la seconde", () => {
    const droite = contactsEntre(boite(), boite({ x: 39 }));
    const gauche = contactsEntre(boite(), boite({ x: -39 }));

    expect(droite[0]!.normale.x).toBeGreaterThan(0);
    expect(gauche[0]!.normale.x).toBeLessThan(0);
  });

  it("est symétrique sur la détection, opposée sur la normale", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -60, max: 60 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -90, max: 90 }),
        (x, y, rotation) => {
          const autre = boite({ x, y, rotation });
          const aversB = contactsEntre(boite(), autre);
          const bversA = contactsEntre(autre, boite());

          expect(aversB.length === 0).toBe(bversA.length === 0);

          if (!aversB[0] || !bversA[0]) return;

          expect(aversB[0].penetration).toBeCloseTo(bversA[0].penetration, 6);

          // L'orientation se décide sur l'écart des centres. Quand cet écart
          // est perpendiculaire à la normale — deux pierres concentriques, ou
          // exactement l'une au-dessus de l'autre sur l'axe qui perd —, il n'y
          // a plus de « de A vers B » à lire : le sens est arbitraire, et il
          // n'a pas à être opposé. Le cairn n'empile jamais deux pierres
          // concentriques ; la propriété porte sur le reste.
          const ecart = aversB[0].normale.x * autre.x + aversB[0].normale.y * autre.y;

          if (Math.abs(ecart) < 1e-9) return;

          expect(aversB[0].normale.x).toBeCloseTo(-bversA[0].normale.x, 6);
          expect(aversB[0].normale.y).toBeCloseTo(-bversA[0].normale.y, 6);
        },
      ),
      { numRuns: 150 },
    );
  });
});

describe("contactsAvecLeSol", () => {
  it("ne rend rien tant que la pierre est en l'air", () => {
    expect(contactsAvecLeSol(boite({ y: -20 }))).toEqual([]);
  });

  it("rend le coin le plus bas d'une pierre inclinée", () => {
    const penchee = boite({ y: -2, rotation: 40 });
    const contacts = contactsAvecLeSol(penchee);
    const plusBas = Math.max(...sommets(penchee).map((point) => point.y));

    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts[0]!.penetration).toBeCloseTo(plusBas, 8);
    expect(contacts[0]!.normale).toEqual({ x: 0, y: -1 });
  });

  it("rend les deux coins d'une pierre à plat enfoncée", () => {
    expect(contactsAvecLeSol(boite({ y: -3 }))).toHaveLength(2);
  });
});

describe("contactsAvecLeCadre", () => {
  const cadre = { gauche: -50, droite: 50 };

  it("laisse tranquille ce qui est dedans", () => {
    expect(contactsAvecLeCadre(boite(), cadre)).toEqual([]);
  });

  it("repousse vers l'intérieur ce qui dépasse", () => {
    expect(contactsAvecLeCadre(boite({ x: -40 }), cadre)[0]!.normale).toEqual({ x: 1, y: 0 });
    expect(contactsAvecLeCadre(boite({ x: 40 }), cadre)[0]!.normale).toEqual({ x: -1, y: 0 });
  });
});
