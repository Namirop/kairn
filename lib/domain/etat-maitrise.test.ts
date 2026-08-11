import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  compterReussitesConsecutives,
  estReussite,
  etatApresRevision,
  JOURS_AVANT_ARCHIVAGE,
  JOURS_AVANT_CONSOLIDATION,
  JOURS_AVANT_REVIEWING,
  REUSSITES_POUR_CONSOLIDER,
  type Note,
} from "./etat-maitrise";

const REGULIER = REUSSITES_POUR_CONSOLIDER;

describe("estReussite", () => {
  it("ne compte que AGAIN comme un échec", () => {
    expect(estReussite("AGAIN")).toBe(false);
    expect(estReussite("HARD")).toBe(true);
    expect(estReussite("GOOD")).toBe(true);
    expect(estReussite("EASY")).toBe(true);
  });
});

describe("compterReussitesConsecutives", () => {
  it("compte depuis le passage le plus récent", () => {
    expect(compterReussitesConsecutives(["AGAIN", "GOOD", "GOOD"])).toBe(2);
  });

  it("s'arrête au premier échec rencontré en remontant", () => {
    expect(compterReussitesConsecutives(["GOOD", "GOOD", "AGAIN"])).toBe(0);
  });

  it("compte une série entière quand rien n'a échoué", () => {
    expect(compterReussitesConsecutives(["GOOD", "HARD", "EASY"])).toBe(3);
  });

  it("rend zéro sur une histoire vide", () => {
    expect(compterReussitesConsecutives([])).toBe(0);
  });
});

describe("etatApresRevision aux bornes", () => {
  it("reste en apprentissage juste sous sept jours", () => {
    expect(etatApresRevision(JOURS_AVANT_REVIEWING - 1, REGULIER, false)).toBe("LEARNING");
  });

  it("passe en révision à sept jours pile", () => {
    expect(etatApresRevision(JOURS_AVANT_REVIEWING, REGULIER, false)).toBe("REVIEWING");
  });

  it("est encore en révision à vingt-et-un jours pile", () => {
    expect(etatApresRevision(JOURS_AVANT_CONSOLIDATION, REGULIER, false)).toBe("REVIEWING");
  });

  it("consolide au-delà de vingt-et-un jours quand la série suit", () => {
    expect(etatApresRevision(JOURS_AVANT_CONSOLIDATION + 1, REGULIER, false)).toBe("CONSOLIDATED");
  });

  it("refuse de consolider un intervalle long sans régularité", () => {
    expect(etatApresRevision(JOURS_AVANT_CONSOLIDATION + 1, REGULIER - 1, false)).toBe("REVIEWING");
  });

  it("consolide encore à trois mois pile", () => {
    expect(etatApresRevision(JOURS_AVANT_ARCHIVAGE, REGULIER, false)).toBe("CONSOLIDATED");
  });

  it("archive au-delà de trois mois", () => {
    expect(etatApresRevision(JOURS_AVANT_ARCHIVAGE + 1, REGULIER, false)).toBe("ARCHIVED");
  });

  it("archive dès que l'utilisateur le déclare, quel que soit l'intervalle", () => {
    expect(etatApresRevision(1, 0, true)).toBe("ARCHIVED");
    expect(etatApresRevision(JOURS_AVANT_CONSOLIDATION + 1, REGULIER, true)).toBe("ARCHIVED");
  });

  it("traite un intervalle nul comme un apprentissage", () => {
    expect(etatApresRevision(0, 0, false)).toBe("LEARNING");
  });
});

describe("propriétés", () => {
  it("rend toujours un état connu", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        (intervalle, reussites, archive) => {
          const etat = etatApresRevision(intervalle, reussites, archive);

          return ["LEARNING", "REVIEWING", "CONSOLIDATED", "ARCHIVED"].includes(etat);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("n'atteint jamais CONSOLIDATED sans la durée et la régularité", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 20 }),
        (intervalle, reussites) => {
          if (etatApresRevision(intervalle, reussites, false) !== "CONSOLIDATED") return true;

          return intervalle > JOURS_AVANT_CONSOLIDATION && reussites >= REUSSITES_POUR_CONSOLIDER;
        },
      ),
      { numRuns: 300 },
    );
  });

  it("compte au plus autant de réussites qu'il y a de passages", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<Note>("AGAIN", "HARD", "GOOD", "EASY"), { maxLength: 30 }),
        (notes) => {
          const compte = compterReussitesConsecutives(notes);

          return compte >= 0 && compte <= notes.length;
        },
      ),
      { numRuns: 300 },
    );
  });
});
