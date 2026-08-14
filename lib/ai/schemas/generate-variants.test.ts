import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FACETTES_DU_VRAI_OU_FAUX } from "@/lib/domain/vrai-ou-faux";
import { toOutputSchema } from "../output-schema";
import { CONCEPTS_PAR_APPEL, GENERATE_VARIANTS, generateVariantsForme } from "./generate-variants";

/**
 * Le premier passage du banc a rendu quatre lots sur vingt-quatre, dont seize
 * où le tableau arrivait en chaîne. On a soupçonné la forme envoyée d'être
 * dégénérée — elle ne l'était pas, mais rien ne le prouvait.
 *
 * Ce test prouve ce que le modèle voit — la forme d'où la grammaire des
 * structured outputs est compilée. Le tableau est revenu, pour grouper trois
 * concepts par appel ; ce test dit à quelles conditions.
 */

function chemin(valeur: unknown, ...cles: string[]): unknown {
  return cles.reduce<unknown>(
    (courant, cle) =>
      typeof courant === "object" && courant !== null ? Reflect.get(courant, cle) : undefined,
    valeur,
  );
}

const CLES = ["rang", "recognition", "mechanism", "boundary", "application"];
const FACETTES = CLES.slice(1);

function question(format: string) {
  return { format, question: "Une question assez longue pour passer.", answerKey: "Une réponse." };
}

function lot(rang: number, formats = ["TRUE_FALSE", "EXPLAIN", "TRUE_FALSE", "MCQ"]) {
  const [reconnaissance, mecanisme, limite, application] = formats;

  return {
    rang,
    recognition: question(reconnaissance ?? "SHORT_ANSWER"),
    mechanism: question(mecanisme ?? "EXPLAIN"),
    boundary: question(limite ?? "TRUE_FALSE"),
    application: {
      ...question(application ?? "MCQ"),
      mcq: { options: ["une", "deux", "trois", "quatre"], correctIndex: 2 },
    },
  };
}

describe("forme de sortie de generate_variants", () => {
  const outil = toOutputSchema(generateVariantsForme).schema;
  const entree = chemin(outil, "properties", "lots", "items");

  it("groupe les concepts dans un tableau, un lot par rang", () => {
    expect(chemin(outil, "properties", "lots", "type")).toBe("array");
    expect(chemin(outil, "properties", "lots", "minItems")).toBe(1);
    expect(Object.keys(chemin(entree, "properties") ?? {})).toEqual(CLES);
    expect(chemin(entree, "required")).toEqual(CLES);
  });

  it("n'ouvre le texte libre que sur le mécanisme", () => {
    // C'est ici que se joue « au plus une question à s'auto-noter » : trois
    // facettes n'offrent aucun format en texte libre, donc le décodage
    // contraint ne peut pas produire un lot qui déborde. Le modèle n'a rien à
    // compter, et une consigne en prose ne peut pas se relâcher.
    for (const cle of ["recognition", "boundary", "application"]) {
      expect(chemin(entree, "properties", cle, "properties", "format", "enum")).toEqual([
        "MCQ",
        "TRUE_FALSE",
        "CLOZE",
        "CODE",
      ]);
    }

    expect(chemin(entree, "properties", "mechanism", "properties", "format", "enum")).toEqual([
      "EXPLAIN",
      "CLOZE",
      "MCQ",
      "CODE",
      "SHORT_ANSWER",
    ]);

    // L'énumération doit rester une contrainte. Le helper du SDK la verse dans
    // la description, où elle n'est plus qu'un conseil — c'est ce qu'on évite.
    expect(JSON.stringify(outil)).not.toContain("{enum:");
  });

  it("refuse le texte libre partout ailleurs que sur le mécanisme", () => {
    for (const cle of ["recognition", "boundary", "application"]) {
      for (const format of ["SHORT_ANSWER", "EXPLAIN"]) {
        const pose = { ...lot(1), [cle]: question(format) };

        expect(GENERATE_VARIANTS.validation.safeParse({ lots: [pose] }).success).toBe(false);
      }
    }
  });

  it("n'exige d'une question que ce que tout format porte", () => {
    // `mcq` et `cloze` sont absents de `required` : une question n'en porte au
    // plus qu'un, et le modèle omet une clé plutôt que de l'annuler.
    for (const cle of FACETTES) {
      expect(chemin(entree, "properties", cle, "required")).toEqual([
        "format",
        "question",
        "answerKey",
      ]);
    }
  });

  it("décrit le MCQ à plat, sans renvoi à une définition partagée", () => {
    expect(JSON.stringify(outil)).not.toContain("$ref");
    expect(JSON.stringify(outil)).not.toContain("$defs");
    expect(JSON.stringify(chemin(entree, "properties", "boundary", "properties", "mcq"))).toContain(
      "correctIndex",
    );
  });

  it("refuse de dériver une forme qui renvoie à une définition partagée", () => {
    // Zod extrait vers `$defs` dès qu'une forme est réutilisée. Le jour où ça
    // arrive ici, on veut une erreur, pas une contrainte muée en description.
    const partagee = z.object({ format: z.enum(["MCQ", "TRUE_FALSE"]) });
    const reutilisee = z.object({ premier: partagee, second: partagee });

    expect(() => toOutputSchema(reutilisee)).not.toThrow();
    expect(() => toOutputSchema(z.object({ un: z.intersection(partagee, partagee) }))).toThrow(
      /allOf|\$ref/,
    );
  });

  it("dérive la forme, jamais la validation", () => {
    // La validation porte des contraintes croisées et une mise à plat : rien de
    // tout cela ne s'exprime en JSON Schema.
    expect(toOutputSchema(GENERATE_VARIANTS.forme).schema).toEqual(outil);
    expect(GENERATE_VARIANTS.validation).not.toBe(GENERATE_VARIANTS.forme);
  });

  it("rend un lot par rang, facettes remplies depuis les clés", () => {
    const sortie = GENERATE_VARIANTS.validation.parse({
      lots: [lot(1), lot(2), lot(CONCEPTS_PAR_APPEL)],
    });

    expect(sortie.lots.map((entree) => entree.rang)).toEqual([1, 2, 3]);
    expect(sortie.lots[0]?.variants.map((variant) => variant.facet)).toEqual([
      "RECOGNITION",
      "MECHANISM",
      "BOUNDARY",
      "APPLICATION",
    ]);
    expect(sortie.lots[0]?.variants[0]?.options).toBeNull();
    expect(sortie.lots[2]?.variants[3]?.correctIndex).toBe(2);
  });

  it("garde le premier de deux lots posés sur le même rang, au lieu de tout refuser", () => {
    // C'était un refus. Refuser emportait les lots corrects du même envoi pour
    // une incohérence qui se tranche toute seule, et l'appel était déjà payé.
    // Les rangs restés sans réponse sont signalés par l'appelant.
    const sortie = GENERATE_VARIANTS.validation.parse({ lots: [lot(1), lot(1), lot(2)] });

    expect(sortie.lots.map((entree) => entree.rang)).toEqual([1, 2]);
  });

  it("ramène cinq options à quatre plutôt que de perdre l'envoi", () => {
    const cinq = {
      ...lot(1),
      application: {
        ...question("MCQ"),
        mcq: { options: ["a", "b", "c", "d", "bonne"], correctIndex: 4 },
      },
    };
    const servi = GENERATE_VARIANTS.validation.parse({ lots: [cinq] }).lots[0]?.variants[3];

    expect(servi?.options).toHaveLength(4);
    expect(servi?.options?.[servi.correctIndex ?? -1]).toBe("bonne");
  });

  it("refuse un QCM dont la bonne réponse ne désigne aucune option", () => {
    // La seule exception assumée : sans savoir laquelle est la bonne, servir la
    // question reviendrait à noter faux quelqu'un qui a raison.
    const perdue = {
      ...lot(1),
      application: {
        ...question("MCQ"),
        mcq: { options: ["a", "b", "c", "d"], correctIndex: 9 },
      },
    };

    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [perdue] }).success).toBe(false);
  });

  it("refuse un mcq posé sur un format libre, et un MCQ sans options", () => {
    const sansOptions = { ...lot(1), application: question("MCQ") };
    const optionsEnTrop = {
      ...lot(1),
      mechanism: {
        ...question("EXPLAIN"),
        mcq: { options: ["a", "b", "c", "d"], correctIndex: 0 },
      },
    };

    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [sansOptions] }).success).toBe(false);
    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [optionsEnTrop] }).success).toBe(false);
  });

  it("refuse un CLOZE sans phrase trouée, et une phrase trouée sur un autre format", () => {
    const cloze = { sentence: "Le lichen est une ___ entre deux espèces.", accepted: ["symbiose"] };
    const sansTrou = { ...lot(1), boundary: question("CLOZE") };
    const trouEnTrop = { ...lot(1), mechanism: { ...question("EXPLAIN"), cloze } };
    const juste = { ...lot(1), boundary: { ...question("CLOZE"), cloze } };

    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [sansTrou] }).success).toBe(false);
    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [trouEnTrop] }).success).toBe(false);
    expect(GENERATE_VARIANTS.validation.safeParse({ lots: [juste] }).success).toBe(true);
  });

  it("rend la phrase trouée et ses formes acceptées à plat, avec la question", () => {
    const cloze = { sentence: "Le lichen est une ___ entre deux espèces.", accepted: ["symbiose"] };
    const sortie = GENERATE_VARIANTS.validation.parse({
      lots: [{ ...lot(1), boundary: { ...question("CLOZE"), cloze } }],
    });

    expect(sortie.lots[0]?.variants[2]?.cloze).toEqual(cloze);
    expect(sortie.lots[0]?.variants[0]?.cloze).toBeNull();
  });

  it("rend la valeur déclarée d'un vrai ou faux, et null partout ailleurs", () => {
    const sortie = GENERATE_VARIANTS.validation.parse({
      lots: [{ ...lot(1), boundary: { ...question("TRUE_FALSE"), estVraie: true } }],
    });

    expect(sortie.lots[0]?.variants[2]?.estVraie).toBe(true);
    expect(sortie.lots[0]?.variants[0]?.estVraie).toBeNull();
  });

  it("laisse passer un vrai ou faux qui ne déclare pas sa valeur", () => {
    // Le contrôle le signalera, mais un appel qui porte trois concepts ne se
    // jette pas pour un champ manquant sur une question.
    const sortie = GENERATE_VARIANTS.validation.parse({
      lots: [{ ...lot(1), boundary: question("TRUE_FALSE") }],
    });

    expect(sortie.lots[0]?.variants[2]?.estVraie).toBeNull();
  });
});

/**
 * Le garde-fou de la table recopiée.
 *
 * `lib/domain/vrai-ou-faux.ts` doit nommer les facettes qui peuvent porter un
 * `TRUE_FALSE`, et `lib/domain/` ne peut pas importer `lib/ai/` — le sens des
 * dépendances l'interdit. La table est donc écrite deux fois, et c'est ce test
 * qui empêche les deux de diverger : le jour où une facette s'ouvre ou se
 * ferme, l'envoi annoncerait sinon une cible que la grammaire refuse, ou en
 * tairait une qu'elle accepte.
 */
describe("les facettes qui peuvent porter un vrai ou faux", () => {
  it("sont exactement celles que le domaine annonce", () => {
    const acceptees = FACETTES.filter(
      (facette) =>
        GENERATE_VARIANTS.validation.safeParse({
          lots: [{ ...lot(1), [facette]: { ...question("TRUE_FALSE"), estVraie: true } }],
        }).success,
    );

    expect(acceptees).toEqual([...FACETTES_DU_VRAI_OU_FAUX]);
  });
});
