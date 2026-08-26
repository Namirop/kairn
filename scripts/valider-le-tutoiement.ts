import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { executerToutLePipeline } from "./verification/depot-simule";

/**
 * Le tutoiement tient-il, sur les deux prompts qui écrivent au lecteur ?
 *
 * `PRODUCT.md` classe le tutoiement parmi les engagements de marque non
 * négociables. Deux prompts s'adressent à quelqu'un : celui d'extraction, par
 * son champ `rejected`, et celui des questions, par les énoncés à l'impératif.
 *
 * **Les deux ont vouvoyé, pour deux raisons différentes.** L'extraction disait
 * « à la deuxième personne » — or « vous » est aussi la deuxième personne, si
 * bien que le modèle tranchait d'un tirage à l'autre. Les questions, elles, ne
 * disaient rien du tout : le silence laissait « Expliquez » sortir naturellement
 * d'un énoncé de quiz. Les deux consignes ont été rendues explicites, et ce
 * script sert à vérifier qu'elles tiennent.
 *
 * **Deux passages par cas, et c'est le minimum.** Le défaut était intermittent :
 * un seul passage l'avait manqué deux fois sur trois. Un tirage qui réussit une
 * fois ne prouve rien sur une consigne que le modèle interprète.
 *
 * Il passe par le chemin anonyme, celui de la landing, parce que c'est là que la
 * faute se voit d'abord — depuis que l'essai montre une question, un « vous »
 * atterrit sur la page qui convertit.
 *
 * **Il vérifie aussi que chaque témoin de rejet est bien rejeté**, sans quoi il
 * se félicite du silence : un texte accepté n'a pas de motif, donc pas de
 * vouvoiement possible à y trouver.
 *
 * À sec par défaut. `--emettre` pour appeler le modèle.
 */

const CORPUS = "corpus-test-landing.md";
const PASSAGES = 2;

/** Les trois témoins de rejet, puis deux témoins qui rendent des questions. */
const REJETS = ["E14", "E15", "E16"];
const QUESTIONS = ["B4", "B5"];

/**
 * Ce qui trahit un vouvoiement, et rien d'autre.
 *
 * On ne cherche pas « vous » n'importe où : un concept peut légitimement citer
 * le mot. On cherche les formes qui **s'adressent** au lecteur — le pronom
 * détaché et les impératifs de deuxième personne du pluriel les plus courants
 * dans un énoncé.
 */
const MARQUEURS = /\b(vous|expliquez|indiquez|décrivez|citez|donnez|choisissez|dites)\b/i;

function texteDuCas(brut: string, code: string): string {
  const section = brut.split(/^### /m).find((partie) => partie.startsWith(`${code} `));
  return section?.match(/```\n([\s\S]*?)\n```/)?.[1]?.trim() ?? "";
}

type Releve = { cas: string; passage: number; ou: string; extrait: string };

type Passage =
  | { refus: string; releves: Releve[]; statut: null; questions: 0 }
  | { refus: null; releves: Releve[]; statut: string; questions: number };

async function passer(
  code: string,
  texte: string,
  passage: number,
  rang: number,
): Promise<Passage> {
  const depot = await deposerSansCompte(texte, `198.51.100.${100 + rang}`, null);

  if (!depot.ok) return { refus: depot.motif, releves: [], statut: null, questions: 0 };

  await executerToutLePipeline(depot.inputId);

  const input = await prisma.input.findUniqueOrThrow({
    where: { id: depot.inputId },
    select: {
      status: true,
      failureReason: true,
      atoms: { select: { variants: { select: { question: true } } } },
    },
  });

  const releves: Releve[] = [];
  const motif = input.failureReason ?? "";

  /*
    Un témoin de rejet qui n'est pas rejeté n'a rien validé.

    E16 l'a montré : rejeté au premier passage, accepté au second, où le modèle
    a fait un texte à trous de l'intention que la personne venait d'exprimer. Le
    script a conclu « aucun vouvoiement » — vrai, et hors sujet : il n'y avait
    aucun motif à lire. Un témoin muet passe tous les contrôles de formulation,
    donc le verdict attendu se vérifie avant eux.
  */
  if (REJETS.includes(code) && !motif) {
    releves.push({
      cas: code,
      passage,
      ou: "verdict",
      extrait: "attendu rejeté, a rendu des concepts",
    });
  }

  if (MARQUEURS.test(motif)) {
    releves.push({ cas: code, passage, ou: "rejet", extrait: motif.slice(0, 90) });
  }

  for (const question of input.atoms.flatMap((atome) => atome.variants)) {
    if (MARQUEURS.test(question.question)) {
      releves.push({ cas: code, passage, ou: "question", extrait: question.question.slice(0, 90) });
    }
  }

  const questions = input.atoms.reduce((total, a) => total + a.variants.length, 0);

  return { refus: null, releves, statut: input.status, questions };
}

async function principal(): Promise<void> {
  const brut = readFileSync(CORPUS, "utf8");
  const cas = [...REJETS, ...QUESTIONS];

  if (!process.argv.includes("--emettre")) {
    console.log(`\nPlan à sec — ${cas.length} cas × ${PASSAGES} passages.\n`);
    console.log(`   Rejets     ${REJETS.join(", ")}  — on lit le champ « rejected »`);
    console.log(`   Questions  ${QUESTIONS.join(", ")}  — on lit les énoncés écrits`);
    console.log(`\n   Environ ${cas.length * PASSAGES + QUESTIONS.length * PASSAGES} appels.`);
    console.log(`\n   Rien n'a été émis. Relance avec --emettre.\n`);
    return;
  }

  if (process.env.MOCK_AI === "true") {
    throw new Error("MOCK_AI=true : cette validation n'a de sens qu'avec de vrais appels.");
  }

  const releves: Releve[] = [];
  let rang = 0;

  for (let passage = 1; passage <= PASSAGES; passage += 1) {
    for (const code of cas) {
      const texte = texteDuCas(brut, code);

      if (!texte) {
        console.warn(`   ${code} absent du corpus`);
        continue;
      }

      rang += 1;
      const resultat = await passer(code, texte, passage, rang);

      if (resultat.refus) {
        console.log(`   ${code} passage ${passage} — refusé : ${resultat.refus}`);
        continue;
      }

      console.log(
        `   ${code} passage ${passage} — ${resultat.statut}, ${resultat.questions} question(s)`,
      );
      releves.push(...resultat.releves);
    }
  }

  if (releves.length === 0) {
    console.log("\n   Rien à signaler. Les deux consignes tiennent sur ces tirages.\n");
    return;
  }

  console.log(`\n   ${releves.length} relevé(s) :`);
  for (const r of releves) console.log(`      ${r.cas} p${r.passage} · ${r.ou} · « ${r.extrait} »`);
  console.log();
  process.exitCode = 1;
}

principal()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
