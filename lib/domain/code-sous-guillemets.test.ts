import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { estUnTermeDeCode, releverLeCodeCite } from "./code-sous-guillemets";

describe("estUnTermeDeCode", () => {
  it("relève un identifiant en casse mêlée", () => {
    for (const terme of ["minSdk", "targetSdk", "applicationId", "versionName", "MainActivity"]) {
      expect(estUnTermeDeCode(terme)).toBe(true);
    }
  });

  it("relève un fichier, un chemin, un paquet, un module", () => {
    for (const terme of [
      "libapp.so",
      "app/build.gradle.kts",
      "com.google.gms.google-services",
      ":app",
      "android/",
      "at(-1)",
    ]) {
      expect(estUnTermeDeCode(terme)).toBe(true);
    }
  });

  it("relève une constante ou un paramètre en souligné", () => {
    for (const terme of ["DATABASE_URL", "max_tokens", "__init__"]) {
      expect(estUnTermeDeCode(terme)).toBe(true);
    }
  });

  /** Ce que la consigne d'origine visait : un mot cité dans sa langue. */
  it("laisse un mot étranger entre guillemets", () => {
    for (const terme of ["ser", "estar", "Doch", "aburrido", "Guinee"]) {
      expect(estUnTermeDeCode(terme)).toBe(false);
    }
  });

  it("laisse une expression, qui respire", () => {
    for (const terme of ["spill the tea", "Kotlin first", "to put up with", "flutter build apk"]) {
      expect(estUnTermeDeCode(terme)).toBe(false);
    }
  });

  /** Ni un numéro de version ni un trou ne sont des identifiants. */
  it("laisse ce qui ne porte aucune lettre", () => {
    for (const terme of ["1.0.1", "2", "___", "8.9.1"]) {
      expect(estUnTermeDeCode(terme)).toBe(false);
    }
  });

  /** Le trait d'union et l'apostrophe sont des signes de la langue. */
  it("ne prend pas un mot composé pour du code", () => {
    expect(estUnTermeDeCode("porte-greffe")).toBe(false);
    expect(estUnTermeDeCode("aujourd'hui")).toBe(false);
  });

  it("laisse les espaces de bord décider comme s'ils n'étaient pas là", () => {
    expect(estUnTermeDeCode(" minSdk ")).toBe(true);
    expect(estUnTermeDeCode("   ")).toBe(false);
  });
});

describe("releverLeCodeCite", () => {
  it("rend un identifiant cité à ses accents graves", () => {
    expect(releverLeCodeCite("Explique le rôle de « minSdk » dans une application.")).toBe(
      "Explique le rôle de `minSdk` dans une application.",
    );
  });

  it("relève plusieurs termes d'une même phrase, et laisse le reste", () => {
    expect(
      releverLeCodeCite(
        "Le dossier « android/ » sert d’hôte, et « Doch » n’a rien à voir avec lui.",
      ),
    ).toBe("Le dossier `android/` sert d’hôte, et « Doch » n’a rien à voir avec lui.");
  });

  it("ne touche pas un texte sans guillemets", () => {
    const tel = "Le dossier `android/` sert d’hôte à Flutter.";

    expect(releverLeCodeCite(tel)).toBe(tel);
  });

  /** Relever ici fabriquerait une paire de plus et casserait le découpage. */
  it("laisse une citation qui porte déjà un accent grave", () => {
    const tel = "On écrit « `minSdk` » dans le fichier.";

    expect(releverLeCodeCite(tel)).toBe(tel);
  });

  it("laisse le trou d’un texte à trou entre ses guillemets", () => {
    const phrase = "Le fichier « settings.gradle.kts » inclut le module « ___ ».";

    expect(releverLeCodeCite(phrase)).toBe(
      "Le fichier `settings.gradle.kts` inclut le module « ___ ».",
    );
  });

  it("n’ajoute ni ne retire de texte, seulement des marqueurs", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const releve = releverLeCodeCite(texte);
        const sansMarqueurs = (valeur: string) => valeur.replace(/[«»`]/g, "").replace(/\s+/g, "");

        expect(sansMarqueurs(releve)).toBe(sansMarqueurs(texte));
      }),
      { numRuns: 500 },
    );
  });
});
