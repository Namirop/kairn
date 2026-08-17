import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  chargeDuJour,
  composerSession,
  dejaRevuAujourdhui,
  estDu,
  estServableAujourdhui,
  jourOuIlRevient,
  lirePlafondDeSession,
  PLAFOND_MAX,
  PLAFOND_MIN,
  plafondRestant,
  type ConceptDu,
} from "./selection-session";

const PARIS = "Europe/Paris";
const LOS_ANGELES = "America/Los_Angeles";
const KATMANDOU = "Asia/Kathmandu";

function concept(
  id: string,
  due: string,
  tags: string[] = [],
  inputId = "depot",
  lastReview: string | null = null,
  scheduledDays = 0,
): ConceptDu {
  return {
    id,
    due: new Date(due),
    tags,
    inputId,
    lastReview: lastReview ? new Date(lastReview) : null,
    scheduledDays,
  };
}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Un concept déjà révisé, décrit par ce qui décide de son urgence : l'intervalle
 * qu'on lui avait promis, et le retard qu'il a pris dessus.
 */
function revu(
  id: string,
  maintenant: string,
  intervalleJours: number,
  retardJours: number,
  tags: string[] = [id],
): ConceptDu {
  const instant = new Date(maintenant).getTime();
  const echeance = instant - retardJours * JOUR_MS;

  return {
    id,
    due: new Date(echeance),
    tags,
    inputId: `depot-${id}`,
    lastReview: new Date(echeance - intervalleJours * JOUR_MS),
    scheduledDays: intervalleJours,
  };
}

describe("estDu", () => {
  it("compare des jours civils, pas des instants", () => {
    // 23 h 00 UTC le 14 : déjà le 15 à Paris, encore le 14 en UTC.
    const echeance = new Date("2026-01-14T23:00:00Z");
    const maintenant = new Date("2026-01-14T23:30:00Z");

    expect(estDu(echeance, maintenant, PARIS)).toBe(true);
    expect(estDu(echeance, maintenant, "UTC")).toBe(true);
  });

  it("tient une échéance du lendemain à l'est de l'UTC", () => {
    // 22 h 00 UTC le 15 = 03 h 45 le 16 à Katmandou : l'utilisateur est déjà le
    // 16, une échéance au 16 est donc échue pour lui.
    const echeance = new Date("2026-01-16T04:00:00Z");
    const maintenant = new Date("2026-01-15T22:00:00Z");

    expect(estDu(echeance, maintenant, KATMANDOU)).toBe(true);
    expect(estDu(echeance, maintenant, "UTC")).toBe(false);
  });

  it("tient la même échéance à l'ouest de l'UTC", () => {
    // 01 h 00 UTC le 16 = 17 h 00 le 15 à Los Angeles : il est encore le 15,
    // une échéance au 16 n'est pas due.
    const echeance = new Date("2026-01-16T12:00:00Z");
    const maintenant = new Date("2026-01-16T01:00:00Z");

    expect(estDu(echeance, maintenant, LOS_ANGELES)).toBe(false);
    expect(estDu(echeance, maintenant, "UTC")).toBe(true);
  });

  it("reste vrai sur une échéance dépassée depuis des jours", () => {
    expect(estDu(new Date("2026-01-10T08:00:00Z"), new Date("2026-01-15T08:00:00Z"), PARIS)).toBe(
      true,
    );
  });

  it("passe au jour suivant à minuit local, pas à minuit UTC", () => {
    const echeance = new Date("2026-01-15T12:00:00Z");
    // 23 h 30 UTC le 14 = 00 h 30 le 15 à Paris : l'échéance du 15 devient due.
    const avantMinuitUtc = new Date("2026-01-14T23:30:00Z");

    expect(estDu(echeance, avantMinuitUtc, PARIS)).toBe(true);
    expect(estDu(echeance, avantMinuitUtc, "UTC")).toBe(false);
  });
});

describe("composerSession", () => {
  it("ne retient que ce qui est échu et ne complète jamais", () => {
    const concepts = [
      concept("du-1", "2026-01-10T08:00:00Z", ["a"]),
      concept("du-2", "2026-01-14T08:00:00Z", ["b"]),
      concept("futur", "2026-01-20T08:00:00Z", ["c"]),
    ];

    const session = composerSession(concepts, new Date("2026-01-15T09:00:00Z"), PARIS);

    expect(session.map((c) => c.id).sort()).toEqual(["du-1", "du-2"]);
  });

  it("garde le plus en train d'être oublié quand le plafond coupe", () => {
    const maintenant = "2026-01-15T09:00:00Z";
    const concepts = [
      // Trois jours de retard sur un intervalle de 90 : il ne risque rien.
      revu("solide", maintenant, 90, 3),
      // Trois jours de retard sur un intervalle de 3 : il est déjà oublié.
      revu("fragile", maintenant, 3, 3),
      revu("tiede", maintenant, 20, 3),
    ];

    const session = composerSession(concepts, new Date(maintenant), PARIS, 2);

    expect(session.map((c) => c.id).sort()).toEqual(["fragile", "tiede"]);
  });

  /**
   * Le cas qui justifie tout le tri : le solide est plus en retard en jours, le
   * fragile est plus en retard par rapport à ce qu'il pouvait tenir. C'est le
   * second qu'on est en train de perdre.
   */
  it("fait passer un intervalle court en léger retard devant un long en gros retard", () => {
    const maintenant = "2026-01-15T09:00:00Z";
    const concepts = [revu("solide", maintenant, 90, 10), revu("fragile", maintenant, 3, 1)];

    const session = composerSession(concepts, new Date(maintenant), PARIS, 1);

    expect(session.map((c) => c.id)).toEqual(["fragile"]);
  });

  it("ne laisse pas un arriéré enterrer un dépôt du jour", () => {
    const maintenant = "2026-01-15T09:00:00Z";
    const arriere = Array.from({ length: 40 }, (_, rang) =>
      revu(`arriere-${rang}`, maintenant, 30, 4, ["arriere"]),
    );
    const neuf = concept("neuf", "2026-01-15T08:00:00Z", ["neuf"], "depot-neuf");

    const session = composerSession([...arriere, neuf], new Date(maintenant), PARIS, 20);

    expect(session.map((c) => c.id)).toContain("neuf");
  });

  it("rend le même ordre quel que soit celui de la requête", () => {
    const maintenant = "2026-01-15T09:00:00Z";
    const concepts = [
      revu("un", maintenant, 3, 3),
      revu("deux", maintenant, 90, 3),
      revu("trois", maintenant, 3, 3),
      concept("quatre", "2026-01-10T08:00:00Z", ["d"], "depot-d"),
    ];

    fc.assert(
      fc.property(fc.shuffledSubarray(concepts, { minLength: 4 }), (melange) => {
        const attendu = composerSession(concepts, new Date(maintenant), PARIS);
        const obtenu = composerSession(melange, new Date(maintenant), PARIS);

        return obtenu.map((c) => c.id).join() === attendu.map((c) => c.id).join();
      }),
      { numRuns: 100 },
    );
  });

  it("rend une session vide plutôt que d'avancer sur du non échu", () => {
    const concepts = [concept("futur", "2026-02-01T08:00:00Z", ["a"])];

    expect(composerSession(concepts, new Date("2026-01-15T09:00:00Z"), PARIS)).toEqual([]);
  });

  it("ne dépasse jamais le plafond, quel que soit le lot", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -40, max: 40 }), { maxLength: 60 }),
        fc.integer({ min: 0, max: 10 }),
        (decalages, plafond) => {
          const maintenant = new Date("2026-06-15T12:00:00Z");
          const concepts = decalages.map((jours, rang) =>
            concept(
              `c-${rang}`,
              new Date(maintenant.getTime() + jours * 24 * 60 * 60 * 1000).toISOString(),
              [`s${rang % 4}`],
            ),
          );

          return composerSession(concepts, maintenant, PARIS, plafond).length <= plafond;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("dejaRevuAujourdhui", () => {
  it("est faux pour un concept jamais passé", () => {
    expect(dejaRevuAujourdhui(null, new Date("2026-01-15T09:00:00Z"), PARIS)).toBe(false);
  });

  it("est vrai dans la journée civile de l'utilisateur", () => {
    const passage = new Date("2026-01-15T07:00:00Z");

    expect(dejaRevuAujourdhui(passage, new Date("2026-01-15T21:00:00Z"), PARIS)).toBe(true);
  });

  it("redevient faux au minuit de l'utilisateur, pas à celui d'UTC", () => {
    const passage = new Date("2026-01-14T22:00:00Z");
    // 23 h 30 UTC le 14 : il est déjà 00 h 30 le 15 à Paris, donc un jour civil
    // plus tard — le concept est de nouveau proposable.
    const apresMinuitLocal = new Date("2026-01-14T23:30:00Z");

    expect(dejaRevuAujourdhui(passage, apresMinuitLocal, PARIS)).toBe(false);
    expect(dejaRevuAujourdhui(passage, apresMinuitLocal, "UTC")).toBe(true);
  });
});

describe("composerSession et le passage du jour", () => {
  it("ne repropose pas un concept déjà revu aujourd'hui", () => {
    // ts-fsrs replanifie un concept en apprentissage à quelques minutes : son
    // échéance est donc encore aujourd'hui, et il ne doit pas revenir pour autant.
    const concepts = [
      concept("revu", "2026-01-15T09:10:00Z", ["a"], "depot", "2026-01-15T09:00:00Z"),
      concept("pas-revu", "2026-01-15T08:00:00Z", ["b"]),
    ];

    const session = composerSession(concepts, new Date("2026-01-15T09:30:00Z"), PARIS);

    expect(session.map((c) => c.id)).toEqual(["pas-revu"]);
  });

  it("le repropose le lendemain", () => {
    const concepts = [
      concept("revu-hier", "2026-01-15T09:10:00Z", ["a"], "depot", "2026-01-15T09:00:00Z"),
    ];

    const session = composerSession(concepts, new Date("2026-01-16T09:30:00Z"), PARIS);

    expect(session.map((c) => c.id)).toEqual(["revu-hier"]);
  });
});

describe("jourOuIlRevient", () => {
  const maintenant = new Date("2026-01-15T09:00:00Z");
  const jour = (due: string, lastReview: string | null = null) =>
    jourOuIlRevient(
      { due: new Date(due), lastReview: lastReview ? new Date(lastReview) : null },
      maintenant,
      PARIS,
    );

  it("dit aujourd'hui pour un concept dû et pas encore vu", () => {
    expect(jour("2026-01-15T08:00:00Z")).toBe("2026-01-15");
  });

  it("dit aujourd'hui pour un concept en retard et pas encore vu", () => {
    expect(jour("2026-01-11T08:00:00Z")).toBe("2026-01-15");
  });

  it("dit demain pour un concept déjà revu aujourd'hui", () => {
    expect(jour("2026-01-15T09:10:00Z", "2026-01-15T09:00:00Z")).toBe("2026-01-16");
  });

  it("dit demain pour un concept en retard de quatre jours mais déjà revu", () => {
    // Le compteur de ce qui revient demain le perdait : son échéance était trop
    // ancienne pour la fenêtre SQL, alors qu'il revient bien demain.
    expect(jour("2026-01-11T08:00:00Z", "2026-01-15T09:00:00Z")).toBe("2026-01-16");
  });

  it("dit son échéance pour un concept encore à venir", () => {
    expect(jour("2026-01-20T08:00:00Z")).toBe("2026-01-20");
    expect(jour("2026-01-20T08:00:00Z", "2026-01-15T09:00:00Z")).toBe("2026-01-20");
  });

  it("ne rend jamais un jour passé", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -400, max: 400 }),
        fc.oneof(fc.constant<number | null>(null), fc.integer({ min: -400, max: 0 })),
        (dueJours, vuJours) => {
          const decale = (n: number) =>
            new Date(maintenant.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

          const rendu = jour(decale(dueJours), vuJours === null ? null : decale(vuJours));

          return rendu >= "2026-01-15";
        },
      ),
      { numRuns: 400 },
    );
  });

  it("dit aujourd'hui exactement quand le concept entre dans la session", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -30, max: 30 }),
        fc.oneof(fc.constant<number | null>(null), fc.integer({ min: -30, max: 0 })),
        (dueJours, vuJours) => {
          const decale = (n: number) => new Date(maintenant.getTime() + n * 24 * 60 * 60 * 1000);
          const concept = {
            due: decale(dueJours),
            lastReview: vuJours === null ? null : decale(vuJours),
          };

          const servable = estServableAujourdhui(concept, maintenant, PARIS);
          const revient = jourOuIlRevient(concept, maintenant, PARIS);

          // Le compteur et la session ne peuvent pas se contredire : elles
          // dérivent du même prédicat.
          return servable === (revient === "2026-01-15");
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe("chargeDuJour", () => {
  it("ne renvoie que ce qui est dû quand la session n'est pas pleine", () => {
    expect(chargeDuJour(12, 20)).toEqual({ aujourdhui: 12, enAttente: 0 });
  });

  it("sépare ce qui passe aujourd'hui de ce qui attend", () => {
    expect(chargeDuJour(38, 20)).toEqual({ aujourdhui: 20, enAttente: 18 });
  });

  it("tient le compte à zéro", () => {
    expect(chargeDuJour(0, 20)).toEqual({ aujourdhui: 0, enAttente: 0 });
  });

  it("conserve le total, quoi qu'il arrive", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 100 }),
        (dus, plafond) => {
          const { aujourdhui, enAttente } = chargeDuJour(dus, plafond);

          return aujourdhui + enAttente === dus && aujourdhui <= Math.max(0, plafond);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("lirePlafondDeSession", () => {
  it("lit un nombre écrit simplement", () => {
    expect(lirePlafondDeSession("20")).toBe(20);
    expect(lirePlafondDeSession(" 8 ")).toBe(8);
    expect(lirePlafondDeSession("050")).toBe(50);
  });

  it("tient les deux bouts de la plage", () => {
    expect(lirePlafondDeSession(String(PLAFOND_MIN))).toBe(PLAFOND_MIN);
    expect(lirePlafondDeSession(String(PLAFOND_MAX))).toBe(PLAFOND_MAX);
  });

  it("refuse ce qui sort de la plage", () => {
    expect(lirePlafondDeSession("4")).toBe(null);
    expect(lirePlafondDeSession("51")).toBe(null);
    expect(lirePlafondDeSession("0")).toBe(null);
  });

  it("refuse ce qui n'est pas un nombre de concepts", () => {
    expect(lirePlafondDeSession("")).toBe(null);
    expect(lirePlafondDeSession("vingt")).toBe(null);
    expect(lirePlafondDeSession("20 concepts")).toBe(null);
    expect(lirePlafondDeSession("-20")).toBe(null);
    expect(lirePlafondDeSession("12,5")).toBe(null);
  });

  it("ne rend jamais un plafond hors de la plage", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 8 }), (saisie) => {
        const plafond = lirePlafondDeSession(saisie);

        return plafond === null || (plafond >= PLAFOND_MIN && plafond <= PLAFOND_MAX);
      }),
      { numRuns: 500 },
    );
  });
});

describe("plafondRestant", () => {
  it("retire ce qui a déjà été fait dans la journée", () => {
    expect(plafondRestant(20, 0)).toBe(20);
    expect(plafondRestant(20, 8)).toBe(12);
  });

  it("tombe à zéro quand la journée est faite, et n'y descend pas plus", () => {
    expect(plafondRestant(20, 20)).toBe(0);
    expect(plafondRestant(20, 31)).toBe(0);
  });

  it("borne des valeurs absurdes plutôt que de rendre un plafond négatif", () => {
    expect(plafondRestant(-5, 0)).toBe(0);
    expect(plafondRestant(20, -3)).toBe(20);
  });

  it("ne rend jamais plus que le plafond, ni moins que zéro", () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 60 }), fc.integer({ min: -5, max: 60 }), (p, f) => {
        const reste = plafondRestant(p, f);

        return reste >= 0 && reste <= Math.max(0, p);
      }),
      { numRuns: 400 },
    );
  });
});
