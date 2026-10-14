import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { executerToutLePipeline } from "../verification/cases/depot-simule";

/**
 * Deux contrôles du prompt d'extraction, lus sur les mêmes dépôts.
 *
 * Le verdict : chaque cas porte ce qu'il doit rendre. Une règle de rejet se juge
 * surtout à ce qu'elle épargne ; les gardes la bordent par quatre côtés : texte
 * minimal (A2), fait sec (B4), long texte répété (D12), notes en puces qui
 * ressemblent à de l'organisation sans en être (C8).
 *
 * Le tutoiement, engagement de `PRODUCT.md` : ni le motif de rejet ni les
 * questions ne doivent vouvoyer (« Expliquez » sort tout seul d'un énoncé de quiz).
 *
 * Les deux défauts sont intermittents (une fois sur deux ou trois) : un tirage
 * réussi ne prouve rien, d'où plusieurs passages par cas.
 *
 * Tout passe par le chemin anonyme, celui de la landing, où un « vous » se voit
 * en premier.
 *
 * À sec par défaut. `--emettre` pour appeler le modèle.
 */

const CORPUS = "scripts/verification/corpus-depot-anonyme.md";

type Attendu = "rejet" | "concepts";
type Cas = { code: string; passages: number; attendu: Attendu };

/**
 * E16, visé par la règle d'altérité, passe trois fois : c'est une instabilité
 * qu'on surveille. E14 et E15, rejets voisins, vérifient que la règle ne les a
 * pas brouillés.
 */
const CAS: Cas[] = [
  { code: "E16", passages: 3, attendu: "rejet" },
  { code: "E14", passages: 2, attendu: "rejet" },
  { code: "E15", passages: 2, attendu: "rejet" },
  { code: "A2", passages: 2, attendu: "concepts" },
  { code: "B4", passages: 2, attendu: "concepts" },
  { code: "D12", passages: 2, attendu: "concepts" },
  { code: "C8", passages: 2, attendu: "concepts" },
];

/**
 * Les formes qui s'adressent au lecteur en le vouvoyant : le pronom et les
 * impératifs les plus courants dans un énoncé. Cherchées dans le motif et les
 * questions seulement, pas dans les concepts qui peuvent citer le mot.
 */
const MARQUEURS = /\b(vous|expliquez|indiquez|décrivez|citez|donnez|choisissez|dites)\b/i;

/**
 * Les textes du corpus. D12 n'a pas de bloc : c'est D11 collé deux fois, comme
 * le corpus le prescrit.
 */
function textesDuCorpus(): Map<string, string> {
  const brut = readFileSync(CORPUS, "utf8");
  const textes = new Map<string, string>();

  for (const section of brut.split(/^### /m).slice(1)) {
    const code = section.split(" ")[0];
    const bloc = section.match(/```\n([\s\S]*?)\n```/)?.[1]?.trim();
    if (code && bloc) textes.set(code, bloc);
  }

  const d11 = textes.get("D11");
  if (d11) textes.set("D12", `${d11}\n\n${d11}`);

  return textes;
}

type Releve = { cas: string; passage: number; ou: string; extrait: string };

type Passage =
  | { refus: string; releves: Releve[]; rendu: null; questions: 0 }
  | { refus: null; releves: Releve[]; rendu: Attendu; questions: number };

async function passer(cas: Cas, texte: string, passage: number, rang: number): Promise<Passage> {
  const depot = await deposerSansCompte(texte, `198.51.100.${100 + rang}`, null);

  if (!depot.ok) return { refus: depot.motif, releves: [], rendu: null, questions: 0 };

  await executerToutLePipeline(depot.inputId);

  const input = await prisma.input.findUniqueOrThrow({
    where: { id: depot.inputId },
    select: {
      failureReason: true,
      atoms: { select: { variants: { select: { question: true } } } },
    },
  });

  const releves: Releve[] = [];
  const motif = input.failureReason ?? "";
  const rendu: Attendu = input.atoms.length > 0 ? "concepts" : "rejet";

  // Le verdict d'abord : un témoin de rejet accepté n'a pas de motif, donc
  // aucun vouvoiement à y trouver, et passerait sans lui.
  if (rendu !== cas.attendu) {
    releves.push({
      cas: cas.code,
      passage,
      ou: "verdict",
      extrait: `attendu ${cas.attendu}, a rendu ${rendu}${motif ? ` — ${motif.slice(0, 60)}` : ""}`,
    });
  }

  if (MARQUEURS.test(motif)) {
    releves.push({ cas: cas.code, passage, ou: "rejet", extrait: motif.slice(0, 90) });
  }

  for (const { question } of input.atoms.flatMap((atome) => atome.variants)) {
    if (MARQUEURS.test(question)) {
      releves.push({ cas: cas.code, passage, ou: "question", extrait: question.slice(0, 90) });
    }
  }

  const questions = input.atoms.reduce((total, a) => total + a.variants.length, 0);

  return { refus: null, releves, rendu, questions };
}

/** Les cas s'entrelacent : on veut des tirages indépendants, pas une rafale. */
function tirages(): { cas: Cas; passage: number }[] {
  const tours = Math.max(...CAS.map((c) => c.passages));
  const suite: { cas: Cas; passage: number }[] = [];

  for (let tour = 1; tour <= tours; tour += 1) {
    for (const cas of CAS) {
      if (tour <= cas.passages) suite.push({ cas, passage: tour });
    }
  }

  return suite;
}

async function principal(): Promise<void> {
  const suite = tirages();

  if (!process.argv.includes("--emettre")) {
    console.log(`\nPlan à sec — ${suite.length} dépôts.\n`);
    for (const cas of CAS) {
      console.log(`   ${cas.code.padEnd(4)} × ${cas.passages}   doit rendre : ${cas.attendu}`);
    }
    console.log(`\n   Rien n'a été émis. Relance avec --emettre.\n`);
    return;
  }

  if (process.env.MOCK_AI === "true") {
    throw new Error("MOCK_AI=true : cette validation n'a de sens qu'avec de vrais appels.");
  }

  const textes = textesDuCorpus();
  const releves: Releve[] = [];
  let rang = 0;

  for (const { cas, passage } of suite) {
    const texte = textes.get(cas.code);

    if (!texte) {
      console.warn(`   ${cas.code} absent du corpus`);
      continue;
    }

    rang += 1;
    const resultat = await passer(cas, texte, passage, rang);

    if (resultat.rendu === null) {
      console.log(`   ${cas.code} p${passage} — refusé avant appel : ${resultat.refus}`);
      continue;
    }

    const verdict = resultat.rendu === cas.attendu ? "conforme" : "ÉCART";
    console.log(
      `   ${cas.code.padEnd(4)} p${passage} — ${resultat.rendu.padEnd(8)} ${verdict}, ${resultat.questions} question(s)`,
    );
    releves.push(...resultat.releves);
  }

  if (releves.length === 0) {
    console.log("\n   Rien à signaler. Verdicts conformes, aucun vouvoiement.\n");
    return;
  }

  console.log(`\n   ${releves.length} relevé(s) :`);
  for (const r of releves) console.log(`      ${r.cas} p${r.passage} · ${r.ou} · ${r.extrait}`);
  console.log();
  process.exitCode = 1;
}

principal()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
