import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Pose } from "./jeu-du-cairn";
import { finDuCairn, pointsDeLaPose, scoreApresPose } from "./score-du-cairn";

const POSE = fc.constantFrom<Pose>("DAPLOMB", "DE_TRAVERS", "TOMBEE");
const POSE_QUI_TIENT = fc.constantFrom<Pose>("DAPLOMB", "DE_TRAVERS");

describe("pointsDeLaPose", () => {
  it("paie la visée le double du posé de travers, et la chute rien", () => {
    expect(pointsDeLaPose("DAPLOMB")).toBe(2);
    expect(pointsDeLaPose("DE_TRAVERS")).toBe(1);
    expect(pointsDeLaPose("TOMBEE")).toBe(0);
  });
});

describe("scoreApresPose", () => {
  it("ajoute ce que la pose vaut", () => {
    expect(scoreApresPose(0, "DAPLOMB")).toBe(2);
    expect(scoreApresPose(5, "DE_TRAVERS")).toBe(6);
  });

  it("remet à zéro quand le cairn tombe, quel que soit le score atteint", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (score) => {
        expect(scoreApresPose(score, "TOMBEE")).toBe(0);
      }),
    );
  });

  it("ne rend jamais de score négatif", () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 50 }), POSE, (score, pose) => {
        expect(scoreApresPose(score, pose)).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("ne fait que monter tant que rien ne tombe", () => {
    fc.assert(
      fc.property(fc.array(POSE_QUI_TIENT, { maxLength: 30 }), (poses) => {
        const total = poses.reduce((score, pose) => {
          const suivant = scoreApresPose(score, pose);
          expect(suivant).toBeGreaterThan(score);
          return suivant;
        }, 0);

        expect(total).toBe(poses.reduce((somme, pose) => somme + pointsDeLaPose(pose), 0));
      }),
    );
  });

  it("repart du sol après une chute, sans souvenir du score d'avant", () => {
    const avant = ["DAPLOMB", "DAPLOMB", "TOMBEE"] as const;
    const apres = avant.reduce<number>((score, pose) => scoreApresPose(score, pose), 0);

    expect(apres).toBe(0);
    expect(scoreApresPose(apres, "DAPLOMB")).toBe(2);
  });
});

describe("finDuCairn", () => {
  it("ne dit rien tant que la pile n'est pas montée", () => {
    expect(finDuCairn([], 7)).toBeNull();
    expect(finDuCairn(["DAPLOMB", "DAPLOMB"], 7)).toBeNull();
  });

  it("ne dit rien d'une pile tombée, même complète", () => {
    expect(finDuCairn(["DAPLOMB", "DAPLOMB", "TOMBEE"], 3)).toBeNull();
  });

  it("réserve le mot fort à la pile entièrement d'aplomb", () => {
    expect(finDuCairn(["DAPLOMB", "DAPLOMB", "DAPLOMB"], 3)).toBe("PARFAIT");
    expect(finDuCairn(["DAPLOMB", "DE_TRAVERS", "DAPLOMB"], 3)).toBe("TENU");
    expect(finDuCairn(["DE_TRAVERS", "DE_TRAVERS", "DE_TRAVERS"], 3)).toBe("TENU");
  });

  it("ne conclut rien sur un total nul ou négatif", () => {
    expect(finDuCairn([], 0)).toBeNull();
    expect(finDuCairn(["DAPLOMB"], -1)).toBeNull();
  });

  it("ne conclut que sur une pile complète et debout", () => {
    fc.assert(
      fc.property(
        fc.array(POSE, { minLength: 1, maxLength: 12 }),
        fc.integer({ min: 1, max: 12 }),
        (poses, total) => {
          const fin = finDuCairn(poses, total);

          if (fin === null) return;

          expect(poses.length).toBeGreaterThanOrEqual(total);
          expect(poses.some((pose) => pose === "TOMBEE")).toBe(false);
        },
      ),
    );
  });
});
