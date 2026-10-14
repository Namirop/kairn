import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { heureLocale } from "./jour-local";
import { unFuseau, unInstant } from "./jour-local.test";
import { prochainRappel } from "./prochain-rappel";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("prochainRappel", () => {
  it("annonce aujourd'hui quand l'heure n'est pas passée", () => {
    // 8 h à Bruxelles, rappel réglé sur 19 h.
    expect(prochainRappel(utc("2026-08-16T06:00:00"), 19, "Europe/Brussels")).toEqual({
      jour: "aujourdhui",
      heure: 19,
    });
  });

  it("annonce demain dès que l'heure est entamée", () => {
    // 19 h 30 à Bruxelles : le rappel de 19 h est parti.
    expect(prochainRappel(utc("2026-08-16T17:30:00"), 19, "Europe/Brussels")).toEqual({
      jour: "demain",
      heure: 19,
    });
  });

  it("lit l'heure chez l'utilisateur, pas en UTC", () => {
    const instant = utc("2026-08-16T20:00:00");

    // 22 h à Bruxelles, le rappel de 21 h est passé ; 16 h à New York, non.
    expect(prochainRappel(instant, 21, "Europe/Brussels").jour).toBe("demain");
    expect(prochainRappel(instant, 21, "America/New_York").jour).toBe("aujourdhui");
  });

  it("tient un fuseau à décalage non entier", () => {
    // 23 h 15 à Katmandou (UTC+5:45) : minuit n'est pas passé, mais 23 h oui.
    const instant = utc("2026-08-16T17:30:00");

    expect(prochainRappel(instant, 23, "Asia/Kathmandu").jour).toBe("demain");
    expect(prochainRappel(instant, 0, "Asia/Kathmandu").jour).toBe("demain");
  });

  it("borne une heure impossible plutôt que de l'annoncer", () => {
    expect(prochainRappel(utc("2026-08-16T06:00:00"), 42, "UTC").heure).toBe(23);
    expect(prochainRappel(utc("2026-08-16T06:00:00"), -1, "UTC").heure).toBe(0);
  });

  it("rend demain exactement quand l'heure locale a atteint celle du rappel", () => {
    fc.assert(
      fc.property(
        unInstant,
        unFuseau,
        fc.integer({ min: 0, max: 23 }),
        (instant, fuseau, heure) => {
          const { jour } = prochainRappel(instant, heure, fuseau);

          return jour === (heureLocale(instant, fuseau) < heure ? "aujourdhui" : "demain");
        },
      ),
      { numRuns: 400 },
    );
  });

  it("rend toujours l'heure réglée quand elle est dicible", () => {
    fc.assert(
      fc.property(
        unInstant,
        unFuseau,
        fc.integer({ min: 0, max: 23 }),
        (instant, fuseau, heure) => {
          return prochainRappel(instant, heure, fuseau).heure === heure;
        },
      ),
      { numRuns: 200 },
    );
  });
});
