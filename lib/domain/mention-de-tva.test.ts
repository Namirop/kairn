import { describe, expect, it } from "vitest";
import { MENTION_FRANCHISE, mentionDeFacture, TVA_COLLECTEE } from "./mention-de-tva";

describe("la mention de TVA", () => {
  it("accompagne chaque facture tant que la TVA n'est pas collectée", () => {
    expect(mentionDeFacture(false)).toBe(MENTION_FRANCHISE);
  });

  it("disparaît dès que la TVA est collectée", () => {
    // Elle affirmerait le contraire de ce qui est débité.
    expect(mentionDeFacture(true)).toBeNull();
  });

  it("suit l'état réel du produit", () => {
    // Le verrou : changer `TVA_COLLECTEE` sans toucher au reste fait échouer ce
    // test, qui rappelle que la mention et la taxe se décident ensemble.
    expect(mentionDeFacture(TVA_COLLECTEE)).toBe(TVA_COLLECTEE ? null : MENTION_FRANCHISE);
  });

  it("cite l'article, parce que c'est lui qui est exigé", () => {
    expect(MENTION_FRANCHISE).toContain("293 B");
  });
});
