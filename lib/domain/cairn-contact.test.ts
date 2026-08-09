import { describe, expect, it } from "vitest";
import { pierreTraversee } from "./cairn-contact";
import { initialiser, renverser } from "./cairn-physique";
import { empiler } from "./cairn-stack";

const PIERRES = empiler(6).pierres;

describe("pierreTraversee", () => {
  it("trouve la pierre sous le point de passage", () => {
    const corps = initialiser(PIERRES);
    const cible = PIERRES[2]!;
    const point = { x: cible.x, y: cible.y };

    expect(pierreTraversee(corps, PIERRES, point, point)).toBe(2);
  });

  it("rend null quand le geste passe à côté", () => {
    const corps = initialiser(PIERRES);
    const loin = { x: 2, y: -200 };

    expect(pierreTraversee(corps, PIERRES, loin, loin)).toBeNull();
  });

  it("attrape une pierre traversée entre deux images, pas seulement à l'arrivée", () => {
    const corps = initialiser(PIERRES);
    const cible = PIERRES[1]!;
    // Un geste rapide : le départ et l'arrivée sont hors de la pierre, le
    // segment la traverse.
    const depuis = { x: cible.x - 40, y: cible.y };
    const vers = { x: cible.x + 40, y: cible.y };

    expect(pierreTraversee(corps, PIERRES, depuis, vers)).not.toBeNull();
    expect(pierreTraversee(corps, PIERRES, depuis, depuis)).toBeNull();
  });

  it("ignore une pierre déjà tombée", () => {
    const corps = renverser(initialiser(PIERRES), 3, { vx: 40, vy: 0 });
    const cible = PIERRES[3]!;
    const point = { x: cible.x, y: cible.y };

    expect(pierreTraversee(corps, PIERRES, point, point)).toBeNull();
  });
});

describe("balayage horizontal", () => {
  it("renverse quelque chose quelle que soit la hauteur du geste", () => {
    // Un geste qui traverse l'empilement de part en part ne doit jamais se
    // faufiler entre deux pierres : de l'extérieur, ça passerait pour un bug.
    const corps = initialiser(PIERRES);
    const haut = Math.min(...PIERRES.map((p) => p.y + p.hauteur / 2));
    const bas = Math.max(...PIERRES.map((p) => p.y - p.hauteur / 2));

    for (let y = haut; y <= bas; y += 0.5) {
      const touchee = pierreTraversee(corps, PIERRES, { x: 0, y }, { x: 100, y });

      expect(touchee, `aucune pierre touchée à la hauteur ${y.toFixed(1)}`).not.toBeNull();
    }
  });
});
