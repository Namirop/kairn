import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { executerToutLePipeline } from "../verification/cases/depot-simule";

/**
 * Le prompt d'extraction tient-il ses deux promesses au lecteur ?
 *
 * Deux contrôles cohabitent ici parce qu'ils se lisent sur les mêmes dépôts.
 *
 * **Le verdict.** Chaque cas porte ce qu'il doit rendre. Un témoin de rejet qui
 * rend des concepts remonte, un témoin de contenu qui se fait rejeter remonte
 * aussi — et c'est le second qui compte le plus : une règle de rejet neuve se
 * juge à ce qu'elle épargne, pas à ce qu'elle coupe. Les gardes sont là pour
 * ça, et elles sont choisies pour border la règle par ses quatre côtés : un
 * texte minimal (A2), un fait sec (B4), un long texte répété (D12) et des notes
 * en puces qui ressemblent à de l'organisation sans en être (C8).
 *
 * **Le tutoiement.** `PRODUCT.md` le classe parmi les engagements non
 * négociables, et deux prompts s'adressent à quelqu'un : l'extraction par son
 * champ `rejected`, les questions par leurs énoncés à l'impératif. Les deux ont
 * vouvoyé, pour deux raisons différentes — l'extraction disait « à la deuxième
 * personne », or « vous » l'est aussi ; les questions ne disaient rien, et
 * « Expliquez » sort tout seul d'un énoncé de quiz.
 *
 * **Plusieurs passages par cas, et c'est le minimum.** Les deux défauts étaient
 * intermittents : E16 a basculé une fois sur deux, le vouvoiement une fois sur
 * trois. Un tirage qui réussit ne prouve rien sur une consigne que le modèle
 * interprète, donc le cas qu'on vient de corriger passe trois fois et les gardes
 * deux.
 *
 * Tout passe par le chemin anonyme, celui de la landing, parce que c'est là que
 * la faute se voit d'abord — depuis que l'essai montre une question, un « vous »
 * atterrit sur la page qui convertit.
 *
 * À sec par défaut. `--emettre` pour appeler le modèle.
 */

const CORPUS = "scripts/verification/corpus-depot-anonyme.md";

type Attendu = "rejet" | "concepts";
type Cas = { code: string; passages: number; attendu: Attendu };

/**
 * Le cas sous surveillance, puis les gardes.
 *
 * E16 est celui que la règle d'altérité vise ; il passe trois fois parce qu'on
 * corrige précisément une instabilité, et qu'un aller-retour ne se voit pas en
 * deux tirages. E14 et E15 vérifient que les rejets déjà acquis le restent : la
 * nouvelle règle est voisine des leurs et pourrait les avoir brouillés.
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
 * Ce qui trahit un vouvoiement, et rien d'autre.
 *
 * On ne cherche pas « vous » n'importe où : un concept peut légitimement citer
 * le mot. On cherche les formes qui **s'adressent** au lecteur — le pronom
 * détaché et les impératifs de deuxième personne du pluriel les plus courants
 * dans un énoncé.
 */
const MARQUEURS = /\b(vous|expliquez|indiquez|décrivez|citez|donnez|choisissez|dites)\b/i;

/**
 * Les textes du corpus, D12 assemblé comme le fichier le prescrit.
 *
 * D12 n'a pas de bloc à lui : c'est D11 collé deux fois, séparé d'une ligne
 * vide. Il vaut comme garde parce qu'il est long et redondant — deux choses qui
 * donnent au modèle l'occasion de renoncer.
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

  /*
    Le verdict se vérifie avant la formulation, sinon le silence se félicite
    lui-même : un texte accepté n'a pas de motif, donc pas de vouvoiement à y
    trouver, et le témoin muet passait tous les contrôles.
  */
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

/**
 * Les cas s'entrelacent au lieu de se suivre.
 *
 * Trois dépôts d'affilée du même texte se répondent moins bien que trois dépôts
 * espacés : on veut trois tirages indépendants, pas une rafale.
 */
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

    /* Le verdict absent est ce qui distingue les deux formes du résultat : un
       dépôt refusé avant l'appel n'a rien rendu du tout. */
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
