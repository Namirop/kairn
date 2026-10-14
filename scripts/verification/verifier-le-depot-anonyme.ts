import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-du-depot";
import { readAiConfig } from "@/lib/ai/config";
import { computeCostUsd } from "@/lib/ai/pricing";
import { executerToutLePipeline } from "./cases/depot-simule";

/**
 * Vérification du chemin public du dépôt anonyme.
 *
 * **Ce que ce script mesure.** La tuyauterie que le banc n'emprunte jamais :
 * que les bornes refusent avant tout appel, que les rejets rejettent, que les
 * cas de contrôle binaires tiennent, que le plafond anonyme coupe sur un
 * message et non sur une exception. Il ne mesure pas la qualité du découpage —
 * elle l'est déjà, sur vingt-sept dépôts et cinq axes, et la refaire ici
 * reviendrait à payer deux fois la même réponse.
 *
 * **Par où il passe.** `deposerSansCompte`, la fonction que l'action de la
 * landing appelle, et rien d'autre. Pas `callAI` : le sujet est justement ce
 * qu'il y a autour — le schéma d'entrée, les deux verrous de l'essai, la
 * session anonyme, la mise en file. Seule la couche HTTP manque, et elle ne
 * fait que lire un cookie et une adresse.
 *
 * **Les verrous ne sont pas contournés, ils sont nourris.** Chaque cas reçoit
 * une adresse de visiteur distincte, ce qui lui ouvre sa propre session, comme
 * pour un visiteur différent. `ESSAI_ANONYME_SANS_LIMITE` reste donc hors du
 * dispositif : le drapeau sert à ouvrir la landing **en production**, pas à
 * tester en local, et un script qui l'allumerait éprouverait un chemin que
 * personne n'emprunte. Le plafond, lui, se teste en réutilisant volontairement
 * une adresse en fin de série.
 *
 * **Ce que la latence dit, et ce qu'elle ne dit pas.** Hors requête, `after()`
 * ne part pas : les jobs sont exécutés à la main, donc le chiffre relevé est
 * celui du modèle et du pipeline, pas celui que voit un visiteur — il manque la
 * prise en charge du job par le runtime. C'est le terme dominant, pas le total.
 *
 * À sec par défaut. `--emettre` pour appeler le modèle pour de vrai.
 */

const CORPUS = "scripts/verification/corpus-depot-anonyme.md";

/** Ce que le corpus déclare comme vérifiable à la ligne près. */
type Controle =
  | "aucun-appel"
  | "uncertain-sans-question"
  | "sortie-anglaise"
  | "rejet-deuxieme-personne"
  | "non-rejete"
  | "pas-de-doublement";

type Cas = {
  code: string;
  titre: string;
  texte: string;
  controles: Controle[];
};

const CONTROLES: Record<string, Controle[]> = {
  A1: ["aucun-appel"],
  D13: ["aucun-appel"],
  D9: ["uncertain-sans-question"],
  D10: ["sortie-anglaise"],
  E14: ["rejet-deuxieme-personne"],
  E15: ["rejet-deuxieme-personne"],
  E16: ["rejet-deuxieme-personne"],
  C8: ["non-rejete"],
  D12: ["pas-de-doublement"],
};

/**
 * L'ordre de passage vient du corpus, pas d'ici : les refus gratuits d'abord,
 * le plafond en dernier. Les cas F sont écartés — ce sont deux textes frais
 * choisis au moment du test, donc un geste humain, pas une entrée de script.
 */
const ORDRE = [
  "A1",
  "D13",
  "A2",
  "B3",
  "B4",
  "B5",
  "E14",
  "E15",
  "E16",
  "C6",
  "C7",
  "C8",
  "D9",
  "D10",
  "D11",
  "D12",
];

/**
 * Lit les cas dans le corpus plutôt que de les recopier.
 *
 * Un corpus recopié dans un script diverge du corpus le jour où l'un des deux
 * change, et c'est toujours le script qui a raison à l'écran. Les textes sont
 * donc extraits des blocs de code, et les deux cas assemblés — D12 et D13 — se
 * construisent depuis D11, comme le fichier le prescrit.
 */
function lireLeCorpus(): Map<string, Cas> {
  const brut = readFileSync(CORPUS, "utf8");
  const cas = new Map<string, Cas>();
  const sections = brut.split(/^### /m).slice(1);

  for (const section of sections) {
    const entete = section.split("\n", 1)[0] ?? "";
    const code = entete.split(/[\s·]/)[0] ?? "";
    const titre = entete.replace(/^\S+\s*·\s*/, "").trim();
    const bloc = section.match(/```\n([\s\S]*?)\n```/);

    if (!code || !bloc?.[1]) continue;

    cas.set(code, { code, titre, texte: bloc[1].trim(), controles: CONTROLES[code] ?? [] });
  }

  const d11 = cas.get("D11");

  if (d11) {
    cas.set("D12", {
      code: "D12",
      titre: "Presque à la borne",
      texte: `${d11.texte}\n\n${d11.texte}`,
      controles: CONTROLES.D12 ?? [],
    });
    cas.set("D13", {
      code: "D13",
      titre: "Dépassement de borne",
      texte: `${d11.texte}\n\n${d11.texte}\n\n${d11.texte}`,
      controles: CONTROLES.D13 ?? [],
    });
  }

  return cas;
}

type Ligne = {
  code: string;
  statut: string;
  latenceMs: number | null;
  concepts: number | null;
  questions: number | null;
  fournisseur: string;
  modele: string;
  bascule: boolean;
  coutUsd: number;
  appels: number;
  ecarts: string[];
};

/**
 * Une adresse par cas, tirée de son rang et non de son nom.
 *
 * Une empreinte calculée sur la première lettre et la longueur donnait la même
 * adresse à B3, B4 et B5 — et comme deux visites par adresse suffisent à fermer
 * la porte, le troisième cas de chaque famille était refusé par le verrou avant
 * d'avoir été testé. Le rang, lui, est unique par construction.
 */
const adresseDe = (rang: number) => `203.0.113.${10 + rang}`;

async function appelsDuDepot(inputId: string) {
  return prisma.aiCall.findMany({
    where: { job: { inputId } },
    select: {
      provider: true,
      model: true,
      basculee: true,
      costUsd: true,
      latencyMs: true,
      success: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function passerUnCas(cas: Cas, adresse: string): Promise<Ligne> {
  const depart = Date.now();
  const depot = await deposerSansCompte(cas.texte, adresse, null);
  const ecarts: string[] = [];

  const vide: Ligne = {
    code: cas.code,
    statut: "refusé",
    latenceMs: null,
    concepts: null,
    questions: null,
    fournisseur: "—",
    modele: "—",
    bascule: false,
    coutUsd: 0,
    appels: 0,
    ecarts,
  };

  if (!depot.ok) {
    // Un refus de borne ne doit rien avoir coûté : ni appel, ni essai. On le
    // vérifie sur la table, pas sur la parole du code.
    if (cas.controles.includes("aucun-appel")) {
      const depuis = new Date(depart);
      const appels = await prisma.aiCall.count({ where: { createdAt: { gte: depuis } } });

      if (appels > 0) ecarts.push(`${appels} ligne(s) AiCall alors qu'aucune n'est permise`);
    }

    return { ...vide, statut: `refusé — ${depot.motif}` };
  }

  if (cas.controles.includes("aucun-appel")) {
    ecarts.push("accepté alors que la borne devait refuser");
  }

  await executerToutLePipeline(depot.inputId);
  const latenceMs = Date.now() - depart;

  const input = await prisma.input.findUniqueOrThrow({
    where: { id: depot.inputId },
    select: {
      status: true,
      failureReason: true,
      atoms: {
        select: { concept: true, uncertain: true, _count: { select: { variants: true } } },
      },
    },
  });

  const appels = await appelsDuDepot(depot.inputId);
  const questions = input.atoms.reduce((total, atome) => total + atome._count.variants, 0);

  // Un plafond atteint n'est pas un défaut du cas : c'est la série qui ne peut
  // plus continuer. Le distinguer évite de parader des lignes en échec qui
  // ressemblent à des régressions produit alors qu'il ne reste plus de budget.
  if (await plafondAtteint(depot.inputId)) {
    return { ...vide, code: cas.code, statut: "plafond", ecarts: [] };
  }

  for (const controle of cas.controles) {
    ecarts.push(...verifier(controle, input, questions));
  }

  return {
    code: cas.code,
    statut: input.status,
    latenceMs,
    concepts: input.atoms.length,
    questions,
    fournisseur: appels[0]?.provider ?? "—",
    modele: appels[0]?.model ?? "—",
    bascule: appels.some((appel) => appel.basculee),
    coutUsd: appels.reduce((total, appel) => total + Number(appel.costUsd), 0),
    appels: appels.length,
    ecarts,
  };
}

/** Vrai si le dépôt a échoué faute de part journalière, et non sur son contenu. */
async function plafondAtteint(inputId: string): Promise<boolean> {
  const jobs = await prisma.generationJob.findMany({
    where: { inputId, status: "FAILED" },
    select: { lastError: true },
  });

  return jobs.some((job) => job.lastError?.includes("AIAnonymousQuotaError") === true);
}

type Depot = {
  status: string;
  failureReason: string | null;
  atoms: { concept: string; uncertain: boolean; _count: { variants: number } }[];
};

/** Les seuls jugements que ce script porte : binaires, et tirés du corpus. */
function verifier(controle: Controle, input: Depot, questions: number): string[] {
  const ecarts: string[] = [];

  if (controle === "uncertain-sans-question") {
    const incertains = input.atoms.filter((atome) => atome.uncertain);

    if (incertains.length === 0) ecarts.push("aucun concept marqué uncertain");

    // La seconde moitié du contrôle porte sur les **incertains**, et elle a
    // cessé d'être vraie par construction : depuis que l'essai montre un
    // échantillon, un concept anonyme reçoit ses questions. Un seul, et jamais
    // un douteux — c'est ce qu'on vérifie, au lieu de vérifier qu'il n'y en a
    // aucune, ce qui produisait un écart sur un chemin qui se porte bien.
    const douteuxQuestionnes = incertains.filter((atome) => atome._count.variants > 0);

    if (douteuxQuestionnes.length > 0) {
      ecarts.push(`${douteuxQuestionnes.length} concept(s) douteux portent une question`);
    }
  }

  if (controle === "sortie-anglaise") {
    // Deux marqueurs français fréquents suffisent : on cherche une sortie
    // écrite dans la langue du dépôt, pas un score linguistique.
    const francais = input.atoms.filter((atome) =>
      /\b(le|la|les|des|une|est|sont|qui|dans)\b/i.test(atome.concept),
    );

    if (francais.length > 0) ecarts.push(`${francais.length} concept(s) rendus en français`);
  }

  if (controle === "rejet-deuxieme-personne") {
    if (input.status !== "REJECTED") ecarts.push(`statut ${input.status} au lieu de REJECTED`);

    const message = input.failureReason ?? "";

    if (!/\b(tu|te|ton|ta|tes|t')/i.test(message)) {
      ecarts.push(`message pas à la deuxième personne : « ${message.slice(0, 60)} »`);
    }
  }

  if (controle === "non-rejete" && input.status === "REJECTED") {
    ecarts.push("rejeté alors que c'est une note de contenu, pas d'organisation");
  }

  if (controle === "pas-de-doublement" && questions >= 0) {
    // Le doublement se juge contre D11, comparé par l'appelant : ici on ne
    // fait que porter le compte.
  }

  return ecarts;
}

/** Le message d'une erreur, sans rien supposer de sa forme. */
function message(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

/**
 * Le plafond, en fin de série.
 *
 * Une même adresse rejoue jusqu'à ce que les verrous coupent. Ce qu'on vérifie
 * n'est pas qu'ils coupent — c'est **comment** : un motif lisible, pas une
 * exception qui remonterait en cinq cents à l'écran.
 */
async function eprouverLePlafond(texte: string): Promise<string[]> {
  const adresse = "203.0.113.250";
  const ecarts: string[] = [];

  for (let essai = 1; essai <= 4; essai += 1) {
    try {
      const depot = await deposerSansCompte(texte, adresse, null);

      if (!depot.ok) {
        if (!depot.motif || depot.motif.length < 10) ecarts.push("motif de refus vide ou obscur");

        console.log(`   plafond atteint au ${essai}ᵉ essai — « ${depot.motif} »`);
        return ecarts;
      }

      // Accepté : on l'annule pour ne pas laisser un dépôt sans découpage.
      await prisma.input.delete({ where: { id: depot.inputId } });
    } catch (erreur) {
      ecarts.push(`exception au lieu d'un refus : ${message(erreur)}`);
      return ecarts;
    }
  }

  ecarts.push("aucun refus après quatre essais depuis la même adresse");
  return ecarts;
}

/**
 * Le plan à sec.
 *
 * **Le coût n'est pas une moyenne globale**, et c'est tout l'écart entre une
 * estimation utile et un chiffre qui rassure à tort. La table `AiCall` compte
 * trois mille appels dominés par le banc — juges compris, sur des prompts sans
 * rapport avec ceux d'un dépôt. Leur moyenne annonçait vingt-cinq centimes pour
 * cette série, soit cinq fois la réalité attendue.
 *
 * On prend donc, par `purpose`, la consommation moyenne réellement observée —
 * entrée, cache, sortie —, et on la fait passer par le tarificateur du produit,
 * au modèle **configuré ici et maintenant**. Le même corpus coûte alors dix fois
 * moins sur Luna que sur Sonnet : ce n'est pas un détail d'estimation, c'est le
 * sujet du portage.
 */
/**
 * Le dépôt anonyme appelle l'extraction, puis **un** lot de questions.
 *
 * Il n'appelait que l'extraction, et l'estimation ne comptait qu'elle. Depuis
 * que la landing montre un échantillon, `decoupage.ts` demande les questions du
 * premier concept questionnable : un appel de plus par visiteur, pas cinq. Ne
 * pas le compter revenait à annoncer la moitié du vrai prix — l'erreur exactement
 * inverse de celle que ce commentaire mettait en garde d'écrire.
 */
const PURPOSES = ["extract_atoms", "generate_variants"] as const;

async function planASec(cas: Cas[]): Promise<void> {
  const avecModele = cas.filter((c) => !c.controles.includes("aucun-appel"));
  const caracteres = avecModele.reduce((total, c) => total + c.texte.length, 0);
  const config = readAiConfig();

  console.log(`
Plan à sec — ${cas.length} cas, dont ${avecModele.length} appellent le modèle.
`);
  console.log(`   Texte total soumis      ${caracteres.toLocaleString("fr-FR")} caractères`);
  console.log(`   Refus sans appel        A1, D13`);
  console.log(`   Plafond éprouvé         en fin de série, même adresse répétée`);
  console.log(`   Cas F                   écartés — deux textes frais, à la main`);
  console.log(`
   Fournisseur configuré   ${config.fournisseur}`);
  console.log(`   Modèle configuré        ${config.model}`);

  let parDepot = 0;
  const detail: string[] = [];

  for (const purpose of PURPOSES) {
    const moyenne = await prisma.aiCall.aggregate({
      _avg: {
        inputTokens: true,
        outputTokens: true,
        cacheCreationTokens: true,
        cacheReadTokens: true,
      },
      _count: true,
      where: { purpose, success: true },
    });

    if (moyenne._count === 0) {
      detail.push(`   ${purpose.padEnd(22)}aucun historique`);
      continue;
    }

    const cout = Number(
      computeCostUsd(config.model, {
        inputTokens: Math.round(moyenne._avg.inputTokens ?? 0),
        outputTokens: Math.round(moyenne._avg.outputTokens ?? 0),
        cacheCreationTokens: Math.round(moyenne._avg.cacheCreationTokens ?? 0),
        cacheReadTokens: Math.round(moyenne._avg.cacheReadTokens ?? 0),
      }),
    );

    parDepot += cout;
    detail.push(
      `   ${purpose.padEnd(22)}${(cout * 100).toFixed(3)} ¢/appel  (sur ${moyenne._count} appels)`,
    );
  }

  console.log();
  for (const ligne of detail) console.log(ligne);

  if (parDepot === 0) {
    console.log(`
   Coût estimé             inconnu : pas d'historique pour ces deux purposes.
`);
    return;
  }

  console.log(
    `
   Coût estimé de la série ${(parDepot * avecModele.length * 100).toFixed(1)} ¢` +
      `  — ${avecModele.length} dépôts × ${(parDepot * 100).toFixed(2)} ¢`,
  );
  console.log(`
   Rien n'a été émis. Relance avec --emettre pour appeler le modèle.
`);
}

function tableau(lignes: Ligne[]): void {
  const col = (valeur: string | number | null, largeur: number) =>
    String(valeur ?? "—").padEnd(largeur);

  console.log(
    `\n${col("cas", 5)}${col("statut", 12)}${col("latence", 10)}${col("cpts", 6)}${col("qsts", 6)}${col("fournisseur", 13)}${col("modèle", 22)}${col("bascule", 9)}coût`,
  );
  console.log("─".repeat(96));

  for (const l of lignes) {
    console.log(
      col(l.code, 5) +
        col(l.statut.slice(0, 11), 12) +
        col(l.latenceMs === null ? "—" : `${(l.latenceMs / 1000).toFixed(1)} s`, 10) +
        col(l.concepts, 6) +
        col(l.questions, 6) +
        col(l.fournisseur, 13) +
        col(l.modele.slice(0, 21), 22) +
        col(l.bascule ? "oui" : "non", 9) +
        `${(l.coutUsd * 100).toFixed(2)} ¢`,
    );
  }
}

async function principal(): Promise<void> {
  const emettre = process.argv.includes("--emettre");
  const corpus = lireLeCorpus();
  const cas = ORDRE.map((code) => corpus.get(code)).filter((c): c is Cas => c !== undefined);

  const manquants = ORDRE.filter((code) => !corpus.has(code));
  if (manquants.length > 0) console.warn(`Cas absents du corpus : ${manquants.join(", ")}`);

  if (!emettre) {
    await planASec(cas);
    return;
  }

  if (process.env.MOCK_AI === "true") {
    throw new Error("MOCK_AI=true : ce test n'a de sens qu'avec de vrais appels.");
  }

  const lignes: Ligne[] = [];

  for (const [rang, unCas] of cas.entries()) {
    process.stdout.write(`   ${unCas.code}… `);
    const ligne = await passerUnCas(unCas, adresseDe(rang));
    lignes.push(ligne);
    process.stdout.write(`${ligne.statut}\n`);

    if (ligne.statut === "plafond") {
      console.log(
        "\n   Part journalière des essais sans compte épuisée (AI_DAILY_CALL_CAP_ANONYME).",
      );
      console.log(
        "   La série s'arrête ici : les cas suivants mesureraient le plafond, pas le produit.",
      );
      break;
    }
  }

  console.log("\n   plafond…");
  const ecartsPlafond = await eprouverLePlafond(corpus.get("A2")?.texte ?? "");

  tableau(lignes);

  // Le doublement se juge par comparaison, donc après la série.
  const d11 = lignes.find((l) => l.code === "D11")?.concepts ?? 0;
  const d12 = lignes.find((l) => l.code === "D12")?.concepts ?? 0;

  if (d11 > 0 && d12 >= d11 * 2) {
    lignes
      .find((l) => l.code === "D12")
      ?.ecarts.push(`${d12} concepts contre ${d11} pour D11 : la déduplication n'absorbe pas`);
  }

  const ecarts = lignes.flatMap((l) => l.ecarts.map((e) => `${l.code} · ${e}`));
  ecarts.push(...ecartsPlafond.map((e) => `plafond · ${e}`));

  const total = lignes.reduce((somme, l) => somme + l.coutUsd, 0);
  console.log(`\n   Coût réel de la série : ${(total * 100).toFixed(1)} ¢`);
  console.log(`   Borne haute du dépôt anonyme : ${CARACTERES_MAXIMUM_ANONYME} caractères`);

  if (ecarts.length === 0) {
    console.log("\n   Aucun écart sur les contrôles binaires.\n");
    return;
  }

  console.log(`\n   ${ecarts.length} écart(s) :`);
  for (const ecart of ecarts) console.log(`      ${ecart}`);
  console.log();
  process.exitCode = 1;
}

principal()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
