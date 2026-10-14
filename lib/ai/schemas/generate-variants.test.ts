import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FACETTES_DU_LOT, type FacetteDuLot } from "@/lib/domain/emplacement-du-trou";
import { deriverLeSchemaDeSortie } from "../schema-de-sortie";
import {
  CONCEPTS_PAR_APPEL,
  contratDeGeneration,
  CONTRAT_DE_GENERATION,
  formeDeGeneration,
} from "./generate-variants";

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
  const outil = deriverLeSchemaDeSortie(formeDeGeneration).schema;
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

        expect(CONTRAT_DE_GENERATION.validation.safeParse({ lots: [pose] }).success).toBe(false);
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

    expect(() => deriverLeSchemaDeSortie(reutilisee)).not.toThrow();
    expect(() =>
      deriverLeSchemaDeSortie(z.object({ un: z.intersection(partagee, partagee) })),
    ).toThrow(/allOf|\$ref/);
  });

  it("dérive la forme, jamais la validation", () => {
    // La validation porte des contraintes croisées et une mise à plat : rien de
    // tout cela ne s'exprime en JSON Schema.
    expect(deriverLeSchemaDeSortie(CONTRAT_DE_GENERATION.forme).schema).toEqual(outil);
    expect(CONTRAT_DE_GENERATION.validation).not.toBe(CONTRAT_DE_GENERATION.forme);
  });

  it("rend un lot par rang, facettes remplies depuis les clés", () => {
    const sortie = CONTRAT_DE_GENERATION.validation.parse({
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
    const sortie = CONTRAT_DE_GENERATION.validation.parse({ lots: [lot(1), lot(1), lot(2)] });

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
    const servi = CONTRAT_DE_GENERATION.validation.parse({ lots: [cinq] }).lots[0]?.variants[3];

    expect(servi?.options).toHaveLength(4);
    expect(servi?.options?.[servi.correctIndex ?? -1]).toBe("bonne");
  });

  /**
   * Plus rien ne fait tomber l'envoi.
   *
   * `18-anglais` a perdu son seul lot parce qu'une phrase trouée était jointe à
   * une question qui n'était pas un texte à trou : un champ en trop, un appel
   * payé, un dépôt entier perdu. Ce qui se rattrape se rattrape ; ce qui ne se
   * sert pas fait disparaître son lot, seul.
   */
  const envoiDeTrois = (fautif: unknown) => ({ lots: [fautif, lot(2), lot(3)] });

  it("écarte la charge posée sur un format qui n'en porte pas, et la signale", () => {
    const cloze = { sentence: "Le lichen est une ___ entre deux espèces.", accepted: ["symbiose"] };
    const enTrop = { ...lot(1), mechanism: { ...question("EXPLAIN"), cloze } };
    const sortie = CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(enTrop));

    expect(sortie.lots).toHaveLength(3);
    expect(sortie.lots[0]?.variants[1]?.cloze).toBeNull();
    expect(sortie.lots[0]?.variants[1]?.chargeIgnoree).toBe(true);
    expect(sortie.lots[0]?.variants[0]?.chargeIgnoree).toBe(false);
  });

  it("fait disparaître le seul lot dont un QCM n'a pas d'options servables", () => {
    const perdue = {
      ...lot(1),
      application: { ...question("MCQ"), mcq: { options: ["a", "b", "c", "d"], correctIndex: 9 } },
    };
    const sortie = CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(perdue));

    // Les deux autres concepts du même appel sont écrits. Le rang manquant est
    // rapporté par l'appelant, qui sait à quel concept il correspond.
    expect(sortie.lots.map((rendu) => rendu.rang)).toEqual([2, 3]);
  });

  it("fait de même pour un QCM sans options et un texte à trou sans phrase", () => {
    const sansOptions = { ...lot(1), application: question("MCQ") };
    const sansTrou = { ...lot(1), boundary: question("CLOZE") };

    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(sansOptions)).lots).toHaveLength(2);
    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(sansTrou)).lots).toHaveLength(2);
  });

  /**
   * Le cas servi en production le 28/08 : une carte blanche, et « Voir la
   * réponse » qui n'affichait rien non plus. La relecture avait retiré ses
   * bornes de longueur, et le minimum était parti avec elles.
   */
  it("fait disparaître le lot d'une question sans texte ou sans réponse", () => {
    const sansTexte = { ...lot(1), mechanism: { ...question("EXPLAIN"), question: "" } };
    const sansReponse = { ...lot(1), mechanism: { ...question("EXPLAIN"), answerKey: "  " } };

    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(sansTexte)).lots).toHaveLength(2);
    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(sansReponse)).lots).toHaveLength(2);
  });

  /**
   * Le lot abrégé du 23/09 : la première question écrite, puis « ... » partout
   * ailleurs. Rien n'était vide, la grammaire était satisfaite, l'appel n'avait
   * pas été tronqué — et une carte portant « ... » a été servie en session.
   */
  it("fait disparaître le lot d'une question abrégée en trois points", () => {
    const abrege = {
      ...lot(1),
      mechanism: { format: "EXPLAIN", question: "...", answerKey: "..." },
    };

    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(abrege)).lots).toHaveLength(2);
  });

  it("fait disparaître le lot d'un QCM dont les options ne se distinguent pas", () => {
    const memes = {
      ...lot(1),
      application: {
        ...question("MCQ"),
        mcq: { options: ["...", "...", "...", "..."], correctIndex: 1 },
      },
    };

    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(memes)).lots).toHaveLength(2);
  });

  it("fait disparaître le lot d'un texte à trou dont la phrase n'a pas de trou", () => {
    const sansTrou = {
      ...lot(1),
      boundary: {
        ...question("CLOZE"),
        cloze: { sentence: "Le lichen est une symbiose.", accepted: ["symbiose"] },
      },
    };

    expect(CONTRAT_DE_GENERATION.validation.parse(envoiDeTrois(sansTrou)).lots).toHaveLength(2);
  });

  /** Les questions écrites avant que l'aide existe n'ont pas de leurres. */
  it("garde un texte à trou sans leurres, écrit avant que l'aide existe", () => {
    const cloze = { sentence: "Le lichen est une ___ entre deux espèces.", accepted: ["symbiose"] };
    const juste = { ...lot(1), boundary: { ...question("CLOZE"), cloze } };

    expect(CONTRAT_DE_GENERATION.validation.parse({ lots: [juste] }).lots).toHaveLength(1);
  });

  it("rend la phrase trouée, ses formes acceptées et ses leurres à plat", () => {
    const cloze = {
      sentence: "Le lichen est une ___ entre deux espèces.",
      accepted: ["symbiose"],
      leurres: ["parasitisme", "commensalisme", "mutualisme"],
    };
    const sortie = CONTRAT_DE_GENERATION.validation.parse({
      lots: [{ ...lot(1), boundary: { ...question("CLOZE"), cloze } }],
    });

    expect(sortie.lots[0]?.variants[2]?.cloze).toEqual(cloze);
    expect(sortie.lots[0]?.variants[0]?.cloze).toBeNull();
  });

  it("rend la valeur déclarée d'un vrai ou faux, et null partout ailleurs", () => {
    const sortie = CONTRAT_DE_GENERATION.validation.parse({
      lots: [{ ...lot(1), boundary: { ...question("TRUE_FALSE"), estVraie: true } }],
    });

    expect(sortie.lots[0]?.variants[2]?.estVraie).toBe(true);
    expect(sortie.lots[0]?.variants[0]?.estVraie).toBeNull();
  });

  it("laisse passer un vrai ou faux qui ne déclare pas sa valeur", () => {
    // Le contrôle le signalera, mais un appel qui porte trois concepts ne se
    // jette pas pour un champ manquant sur une question.
    const sortie = CONTRAT_DE_GENERATION.validation.parse({
      lots: [{ ...lot(1), boundary: question("TRUE_FALSE") }],
    });

    expect(sortie.lots[0]?.variants[2]?.estVraie).toBeNull();
  });
});

/**
 * L'emplacement du texte à trou, imposé par la grammaire et non par une phrase.
 *
 * C'est ce qui remplace « une des quatre questions au moins est un CLOZE » :
 * cette consigne a tenu jusqu'à ce qu'une autre tire dans l'autre sens, et 41
 * lots sur 80 se sont retrouvés sans aucun trou. Ce test prouve ce que le modèle
 * voit — une énumération à une valeur et une charge requise, les deux seuls
 * mots-clés que le décodage contraint fait respecter.
 */
describe("l'emplacement du texte à trou", () => {
  const facetteDe = (trou: FacetteDuLot, cle: string) =>
    chemin(
      deriverLeSchemaDeSortie(contratDeGeneration(trou).forme).schema,
      "properties",
      "lots",
      "items",
      "properties",
      cle,
    );

  it("ne laisse que CLOZE sur la facette désignée", () => {
    for (const trou of FACETTES_DU_LOT) {
      expect(chemin(facetteDe(trou, trou), "properties", "format", "enum")).toEqual(["CLOZE"]);
    }
  });

  it("exige la phrase trouée sur cette facette, au lieu de l'accepter", () => {
    expect(chemin(facetteDe("boundary", "boundary"), "required")).toContain("cloze");
  });

  it("laisse les trois autres facettes choisir leur format", () => {
    for (const cle of FACETTES_DU_LOT.filter((facette) => facette !== "boundary")) {
      const formats = chemin(facetteDe("boundary", cle), "properties", "format", "enum");

      expect(Array.isArray(formats) && formats.length).toBeGreaterThan(1);
    }
  });

  it("n'impose rien quand aucun emplacement n'est demandé", () => {
    const formats = chemin(
      deriverLeSchemaDeSortie(CONTRAT_DE_GENERATION.forme).schema,
      "properties",
      "lots",
      "items",
      "properties",
      "boundary",
      "properties",
      "format",
      "enum",
    );

    expect(Array.isArray(formats) && formats.length).toBeGreaterThan(1);
  });
});
