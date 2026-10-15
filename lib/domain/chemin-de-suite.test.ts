import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cheminDeSuite } from "./chemin-de-suite";

describe("cheminDeSuite", () => {
  it("garde un chemin interne avec sa requête et son ancre", () => {
    expect(cheminDeSuite("/depots/abc?vue=liste#fin")).toBe("/depots/abc?vue=liste#fin");
  });

  it("refuse l'absence de valeur et ce qui n'est pas un chemin", () => {
    expect(cheminDeSuite(undefined)).toBeNull();
    expect(cheminDeSuite("")).toBeNull();
    expect(cheminDeSuite("https://evil.example")).toBeNull();
    expect(cheminDeSuite("javascript:alert(1)")).toBeNull();
  });

  it.each([
    ["//evil.example"],
    ["/\\evil.example"],
    ["/\\/evil.example"],
    ["/\t/evil.example"],
    ["/\n/evil.example"],
    ["/\r//evil.example"],
  ])("refuse %j, que le navigateur lirait comme une autre origine", (valeur) => {
    expect(cheminDeSuite(valeur)).toBeNull();
  });

  it("ne mène jamais hors de l'origine, quelle que soit l'entrée", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.string().map((s) => `/${s}`),
          fc
            .constantFrom("/", "\\", "/\\", "//", "\t", "%2F", "%5C", "@", ":")
            .chain((debut) => fc.string().map((s) => `${debut}${s}`)),
        ),
        (valeur) => {
          const chemin = cheminDeSuite(valeur);

          if (chemin === null) return;

          expect(chemin.startsWith("/")).toBe(true);
          expect(chemin.startsWith("//")).toBe(false);
          expect(new URL(chemin, "https://kairn.me").origin).toBe("https://kairn.me");
        },
      ),
    );
  });
});
