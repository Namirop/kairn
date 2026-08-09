import { describe, expect, it } from "vitest";
import { empiler, LARGEUR_VUE } from "./cairn-stack";

describe("empiler", () => {
  it("pose une pierre par unité demandée", () => {
    expect(empiler(0).pierres).toHaveLength(0);
    expect(empiler(1).pierres).toHaveLength(1);
    expect(empiler(7).pierres).toHaveLength(7);
    expect(empiler(40).pierres).toHaveLength(40);
  });

  it("traite un empilement vide comme un cas valide, pas comme une erreur", () => {
    const vide = empiler(0);

    expect(vide.pierres).toEqual([]);
    expect(vide.hauteur).toBeGreaterThan(0);
    expect(vide.ySol).toBeGreaterThan(0);
  });

  it("ignore un nombre négatif ou fractionnaire plutôt que de produire un cairn absurde", () => {
    expect(empiler(-3).pierres).toHaveLength(0);
    expect(empiler(2.7).pierres).toHaveLength(2);
  });

  it("rend exactement le même empilement pour les mêmes graines", () => {
    const graines = ["cmg7x2f", "cmg7x1a", "cmg7wz8"];

    expect(empiler(3, graines)).toEqual(empiler(3, graines));
  });

  it("rend le même empilement d'une exécution à l'autre sans graines", () => {
    expect(empiler(5)).toEqual(empiler(5));
  });

  it("rend des empilements différents pour des graines différentes", () => {
    const a = empiler(3, ["alpha", "beta", "gamma"]);
    const b = empiler(3, ["delta", "epsilon", "zeta"]);

    expect(a.pierres.map((p) => p.chemin)).not.toEqual(b.pierres.map((p) => p.chemin));
  });

  it("attache la forme d'une pierre à sa graine, pas à son rang", () => {
    // La même graine au même rang doit redonner la même pierre, même si les
    // autres pierres de l'empilement changent.
    const a = empiler(3, ["fixe", "autre-1", "autre-2"]);
    const b = empiler(3, ["fixe", "different-1", "different-2"]);

    expect(a.pierres[0]?.chemin).toBe(b.pierres[0]?.chemin);
    expect(a.pierres[0]?.rotation).toBe(b.pierres[0]?.rotation);
  });

  it("s'affine en montant : la pierre du sommet est plus étroite que celle du bas", () => {
    const { pierres } = empiler(8);
    const largeur = (chemin: string) => {
      const xs = [...chemin.matchAll(/-?\d+(?:\.\d+)?(?= -?\d+(?:\.\d+)?)/g)].map(Number);
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(largeur(pierres.at(-1)!.chemin)).toBeLessThan(largeur(pierres[0]!.chemin));
  });

  it("empile vers le haut, sans chevauchement d'ordonnée", () => {
    const { pierres } = empiler(6);
    const ordonnees = pierres.map((p) => p.y);

    // Les y sont négatifs et strictement décroissants : chaque pierre est
    // au-dessus de la précédente.
    for (let i = 1; i < ordonnees.length; i += 1) {
      expect(ordonnees[i]!).toBeLessThan(ordonnees[i - 1]!);
    }
  });

  it("garde chaque pierre dans le cadre", () => {
    const { pierres, hauteur, ySol } = empiler(12);

    for (const pierre of pierres) {
      expect(pierre.x).toBeGreaterThan(0);
      expect(pierre.x).toBeLessThan(LARGEUR_VUE);
      expect(pierre.y).toBeGreaterThan(-hauteur + ySol);
      expect(pierre.y).toBeLessThanOrEqual(0);
      expect(Math.abs(pierre.rotation)).toBeLessThanOrEqual(3.5);
      expect([0, 1, 2]).toContain(pierre.nuance);
    }
  });

  it("rend une clé unique par pierre, pour que le rendu ne les confonde pas", () => {
    const cles = empiler(20).pierres.map((p) => p.cle);

    expect(new Set(cles).size).toBe(cles.length);
  });

  it("grandit en hauteur quand on ajoute des pierres", () => {
    expect(empiler(3).hauteur).toBeLessThan(empiler(9).hauteur);
  });
});
