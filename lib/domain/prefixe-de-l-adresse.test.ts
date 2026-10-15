import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { prefixeDeLAdresse } from "./prefixe-de-l-adresse";

const groupe = fc.integer({ min: 0, max: 0xffff }).map((n) => n.toString(16));
const ipv6Complete = fc.array(groupe, { minLength: 8, maxLength: 8 });

describe("prefixeDeLAdresse", () => {
  it("garde une IPv4 entière", () => {
    expect(prefixeDeLAdresse("203.0.113.7")).toBe("203.0.113.7");
  });

  it("ramène une IPv4 encapsulée à l'IPv4", () => {
    expect(prefixeDeLAdresse("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("réduit une IPv6 à son /64, quelle que soit sa notation", () => {
    expect(prefixeDeLAdresse("2001:db8:85a3:0042:1000:8a2e:370:7334")).toBe(
      "2001:db8:85a3:42::/64",
    );
    expect(prefixeDeLAdresse("2001:DB8:85A3:42::1")).toBe("2001:db8:85a3:42::/64");
    expect(prefixeDeLAdresse("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(prefixeDeLAdresse("::1")).toBe("0:0:0:0::/64");
    expect(prefixeDeLAdresse("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(prefixeDeLAdresse("64:ff9b::192.0.2.33")).toBe("64:ff9b:0:0::/64");
  });

  it("rend telle quelle une entrée qui ne se lit pas", () => {
    expect(prefixeDeLAdresse("inconnue")).toBe("inconnue");
    expect(prefixeDeLAdresse("1::2::3")).toBe("1::2::3");
    expect(prefixeDeLAdresse("zzzz::1")).toBe("zzzz::1");
  });

  it("donne le même préfixe à toutes les adresses d'un même /64", () => {
    fc.assert(
      fc.property(ipv6Complete, ipv6Complete, (a, b) => {
        const memeReseau = [...a.slice(0, 4), ...b.slice(4)];

        expect(prefixeDeLAdresse(memeReseau.join(":"))).toBe(prefixeDeLAdresse(a.join(":")));
      }),
    );
  });

  it("sépare deux /64 différents", () => {
    fc.assert(
      fc.property(ipv6Complete, ipv6Complete, (a, b) => {
        fc.pre(a.slice(0, 4).some((g, i) => parseInt(g, 16) !== parseInt(b[i] ?? "", 16)));

        expect(prefixeDeLAdresse(a.join(":"))).not.toBe(prefixeDeLAdresse(b.join(":")));
      }),
    );
  });

  it("lit pareil la forme compressée et la forme développée", () => {
    fc.assert(
      fc.property(
        ipv6Complete,
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 1, max: 8 }),
        (groupes, debut, longueur) => {
          const fin = Math.min(8, debut + longueur);
          const zeros = [
            ...groupes.slice(0, debut),
            ...Array<string>(fin - debut).fill("0"),
            ...groupes.slice(fin),
          ];
          const compressee = `${zeros.slice(0, debut).join(":")}::${zeros.slice(fin).join(":")}`;

          expect(prefixeDeLAdresse(compressee)).toBe(prefixeDeLAdresse(zeros.join(":")));
        },
      ),
    );
  });
});
