import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bornerLeNeuf, PART_NEUVE, placesPourLeNeuf } from "./part-de-nouveaute";

const HIER = new Date("2026-09-03T10:00:00Z");

type Concept = { id: string; lastReview: Date | null };

const neuf = (id: string): Concept => ({ id, lastReview: null });
const revu = (id: string): Concept => ({ id, lastReview: HIER });

const neufs = (combien: number) => Array.from({ length: combien }, (_, i) => neuf(`n${i}`));
const revus = (combien: number) => Array.from({ length: combien }, (_, i) => revu(`r${i}`));

const compte = (retenus: Concept[]) => ({
  neufs: retenus.filter((c) => c.lastReview === null).length,
  revus: retenus.filter((c) => c.lastReview !== null).length,
});

const unConcept = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  lastReview: fc.option(fc.constant(HIER), { nil: null }),
});

describe("placesPourLeNeuf", () => {
  it("garantit sa part quand la révision se bouscule", () => {
    expect(placesPourLeNeuf(20, 100)).toBe(8);
    expect(placesPourLeNeuf(5, 100)).toBe(2);
    expect(placesPourLeNeuf(50, 100)).toBe(20);
  });

  it("prend tout ce que la révision ne réclame pas", () => {
    expect(placesPourLeNeuf(20, 0)).toBe(20);
    expect(placesPourLeNeuf(20, 5)).toBe(15);
    expect(placesPourLeNeuf(20, 12)).toBe(8);
  });

  it("laisse au moins une place tant que la session en a une", () => {
    expect(placesPourLeNeuf(1, 50)).toBe(1);
    expect(placesPourLeNeuf(2, 50)).toBe(1);
  });

  it("ne rend rien d'une session vide ou négative", () => {
    expect(placesPourLeNeuf(0, 10)).toBe(0);
    expect(placesPourLeNeuf(-3, 10)).toBe(0);
  });

  it("ne dépasse jamais le plafond, ni ne descend sous sa part", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 300 }),
        (plafond, disponibles) => {
          const places = placesPourLeNeuf(plafond, disponibles);

          return places <= plafond && places >= Math.max(1, Math.round(plafond * PART_NEUVE));
        },
      ),
    );
  });
});

describe("bornerLeNeuf", () => {
  it("laisse le neuf prendre toute la session quand rien n'est à réviser", () => {
    expect(compte(bornerLeNeuf(neufs(50), 20))).toEqual({ neufs: 20, revus: 0 });
  });

  it("réserve la révision dès qu'elle se bouscule", () => {
    // Le dimanche à trois articles : soixante concepts neufs entrent à huit par
    // jour, et douze places restent à ce qu'on révisait déjà.
    const candidats = [...neufs(60), ...revus(30)];

    expect(compte(bornerLeNeuf(candidats, 20))).toEqual({ neufs: 8, revus: 12 });
  });

  it("donne au neuf ce que la révision ne prend pas", () => {
    expect(compte(bornerLeNeuf([...neufs(50), ...revus(5)], 20))).toEqual({ neufs: 15, revus: 5 });
  });

  it("ne perd aucune place quand un camp est trop court", () => {
    expect(compte(bornerLeNeuf([...neufs(3), ...revus(30)], 20))).toEqual({ neufs: 3, revus: 17 });
    expect(compte(bornerLeNeuf([...neufs(30), ...revus(0)], 20))).toEqual({ neufs: 20, revus: 0 });
  });

  it("rend tout ce qui tient sous le plafond, sans rien borner", () => {
    const candidats = [...neufs(6), ...revus(4)];

    expect(bornerLeNeuf(candidats, 20)).toEqual(candidats);
  });

  it("suit l'ordre d'urgence qu'on lui donne, sans le refaire", () => {
    // Sur trois places, une seule revient au neuf : « a » entre, « c » et « e »
    // attendent, et les deux révisions prennent le reste. Le résultat sort dans
    // l'ordre reçu et non dans l'ordre où les deux camps ont été servis.
    const candidats = [neuf("a"), revu("b"), neuf("c"), revu("d"), neuf("e")];

    expect(bornerLeNeuf(candidats, 3).map((c) => c.id)).toEqual(["a", "b", "d"]);
  });

  it("rend une session vide sur un plafond nul", () => {
    expect(bornerLeNeuf([...neufs(5), ...revus(5)], 0)).toEqual([]);
  });

  it("sert toujours le plafond, ou tout ce qui est dû s'il y en a moins", () => {
    fc.assert(
      fc.property(
        fc.array(unConcept, { maxLength: 80 }),
        fc.integer({ min: 0, max: 40 }),
        (candidats, plafond) => {
          const retenus = bornerLeNeuf(candidats, plafond);

          return retenus.length === Math.min(plafond, candidats.length);
        },
      ),
    );
  });

  it("est une sous-suite de ce qu'on lui donne : rien n'est réordonné", () => {
    fc.assert(
      fc.property(
        fc.array(unConcept, { maxLength: 80 }),
        fc.integer({ min: 0, max: 40 }),
        (candidats, plafond) => {
          const retenus = bornerLeNeuf(candidats, plafond);
          let curseur = 0;

          for (const retenu of retenus) {
            curseur = candidats.indexOf(retenu, curseur) + 1;

            if (curseur === 0) return false;
          }

          return true;
        },
      ),
    );
  });

  it("ne laisse jamais le neuf dépasser ses places", () => {
    fc.assert(
      fc.property(
        fc.array(unConcept, { maxLength: 80 }),
        fc.integer({ min: 0, max: 40 }),
        (candidats, plafond) => {
          const disponibles = candidats.filter((c) => c.lastReview !== null).length;
          const retenus = bornerLeNeuf(candidats, plafond);

          return compte(retenus).neufs <= placesPourLeNeuf(plafond, disponibles);
        },
      ),
    );
  });
});
