import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { empiler, LARGEUR_VUE } from "./cairn-stack";
import { PIERRES_PAR_CAIRN, repartirEnCairns, tracerLeSentier } from "./cairn-sentier";

describe("repartirEnCairns", () => {
  it("garde tout dans un seul cairn tant que le palier n'est pas dépassé", () => {
    expect(repartirEnCairns(1)).toEqual([1]);
    expect(repartirEnCairns(7)).toEqual([7]);
    expect(repartirEnCairns(PIERRES_PAR_CAIRN)).toEqual([PIERRES_PAR_CAIRN]);
  });

  it("ouvre un cairn de plus à la pierre qui dépasse", () => {
    expect(repartirEnCairns(11)).toEqual([10, 1]);
    expect(repartirEnCairns(20)).toEqual([10, 10]);
    expect(repartirEnCairns(25)).toEqual([10, 10, 5]);
  });

  it("ne rend aucun cairn pour un sentier vide", () => {
    expect(repartirEnCairns(0)).toEqual([]);
  });

  it("ignore un nombre négatif ou fractionnaire plutôt que de produire un sentier absurde", () => {
    expect(repartirEnCairns(-4)).toEqual([]);
    expect(repartirEnCairns(11.8)).toEqual([10, 1]);
  });

  it("se rabat sur un cairn par pierre plutôt que de boucler sur un palier nul", () => {
    expect(repartirEnCairns(3, 0)).toEqual([1, 1, 1]);
    expect(repartirEnCairns(3, -2)).toEqual([1, 1, 1]);
  });

  it("conserve le total, et ne dépasse jamais le palier", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 400 }),
        fc.integer({ min: 1, max: 30 }),
        (n, palier) => {
          const tas = repartirEnCairns(n, palier);

          expect(tas.reduce((somme, combien) => somme + combien, 0)).toBe(n);
          expect(tas.every((combien) => combien >= 1 && combien <= palier)).toBe(true);
          expect(tas).toHaveLength(Math.ceil(n / palier));
        },
      ),
    );
  });

  it("remplit avant d'ouvrir : seul le dernier cairn peut être incomplet", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 400 }),
        fc.integer({ min: 1, max: 30 }),
        (n, palier) => {
          const tas = repartirEnCairns(n, palier);

          expect(tas.slice(0, -1).every((combien) => combien === palier)).toBe(true);
        },
      ),
    );
  });
});

describe("tracerLeSentier", () => {
  it("rend le premier cairn exactement comme un empilement seul", () => {
    const graines = ["cmg7x2f", "cmg7x1a", "cmg7wz8"];

    expect(tracerLeSentier(3, graines).cairns[0]?.pierres).toEqual(empiler(3, graines).pierres);
    expect(tracerLeSentier(3, graines).hauteur).toBe(empiler(3, graines).hauteur);
  });

  it("garde la place d'un cairn quand rien n'est encore posé", () => {
    const vide = tracerLeSentier(0);

    expect(vide.cairns).toEqual([]);
    expect(vide.total).toBe(0);
    expect(vide.largeur).toBe(LARGEUR_VUE);
    expect(vide.hauteur).toBeGreaterThan(0);
  });

  it("aligne les cairns de gauche à droite, sans les superposer", () => {
    const sentier = tracerLeSentier(25);
    const decalages = sentier.cairns.map((cairn) => cairn.decalage);

    expect(decalages).toHaveLength(3);
    expect(decalages[0]).toBe(0);
    expect(decalages[1]).toBeGreaterThanOrEqual(LARGEUR_VUE);
    expect(decalages[2]).toBeGreaterThanOrEqual((decalages[1] ?? 0) + LARGEUR_VUE);
  });

  it("élargit la vue d'un cairn à l'autre, jamais d'une pierre à l'autre", () => {
    expect(tracerLeSentier(1).largeur).toBe(tracerLeSentier(10).largeur);
    expect(tracerLeSentier(11).largeur).toBeGreaterThan(tracerLeSentier(10).largeur);
    expect(tracerLeSentier(11).largeur).toBe(tracerLeSentier(20).largeur);
  });

  it("prend la hauteur du cairn le plus haut, pas celle du dernier", () => {
    expect(tracerLeSentier(11).hauteur).toBe(tracerLeSentier(10).hauteur);
  });

  it("distribue les graines dans l'ordre, sans en réutiliser une", () => {
    const graines = Array.from({ length: 14 }, (_, rang) => `atome-${rang}`);
    const cles = tracerLeSentier(14, graines).cairns.flatMap((cairn) =>
      cairn.pierres.map((pierre) => pierre.cle),
    );

    expect(cles).toEqual(graines);
  });

  it("donne des formes distinctes aux cairns même sans graines", () => {
    const [premier, second] = tracerLeSentier(20).cairns;

    expect(premier?.pierres.map((pierre) => pierre.chemin)).not.toEqual(
      second?.pierres.map((pierre) => pierre.chemin),
    );
  });

  it("pose autant de pierres qu'on en a retenues, et les numérote sans trou", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 120 }), (n) => {
        const sentier = tracerLeSentier(n);
        const posees = sentier.cairns.flatMap((cairn) => cairn.pierres);
        const rangs = sentier.cairns.map((cairn) => cairn.premierRang);

        expect(posees).toHaveLength(n);
        expect(sentier.total).toBe(n);
        expect(new Set(posees.map((pierre) => pierre.cle)).size).toBe(n);
        expect(rangs).toEqual(
          sentier.cairns.map((_, rang) =>
            sentier.cairns.slice(0, rang).reduce((somme, c) => somme + c.pierres.length, 0),
          ),
        );
      }),
    );
  });

  it("rend le même sentier pour les mêmes graines", () => {
    const graines = Array.from({ length: 23 }, (_, rang) => `atome-${rang}`);

    expect(tracerLeSentier(23, graines)).toEqual(tracerLeSentier(23, graines));
  });
});
