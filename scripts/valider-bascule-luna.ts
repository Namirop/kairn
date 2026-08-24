import "dotenv/config";
import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/client";
import { startOfUtcDay } from "@/lib/db/ai-call";

/**
 * Validation staging — la bascule Luna → Sonnet sert quand Luna tombe.
 *
 * On force un échec du pont OpenRouter en pointant `AI_MODEL` vers un
 * identifiant qui n'existe pas dans le catalogue OpenRouter — un 404 renvoyé
 * par la passerelle, converti côté client en `AICallFailedError`. Le code de
 * repli doit alors basculer sur Sonnet Anthropic natif, la ligne suivante
 * d'`AiCall` doit porter `basculee=true`, `provider=anthropic`,
 * `model=claude-sonnet-5`, et le tout doit **rendre une valeur valide** à
 * l'appelant — c'est ça la sécurité qu'on vend.
 *
 * L'alerte à cinq bascules/jour ne se déclenche que si le seuil est déjà
 * dépassé ; ce script ne cherche pas à envoyer l'email — pour ça, il faut
 * dépasser cinq à la main sur la journée (ou tester `alerte-de-bascule` avec
 * une valeur `bascules=6`). Le test ici porte sur la mécanique du repli, pas
 * sur la mécanique de l'alerte.
 *
 * Coût attendu : quelques dixièmes de cent (l'appel Sonnet). Prérequis
 * d'environnement identiques à `valider-staging-luna.ts` — le fournisseur
 * doit être `openrouter` (sinon il n'y a rien à basculer), et Anthropic doit
 * être joignable (le repli en dépend).
 */

function refuser(motif: string): never {
  console.error(`Validation bascule refusée : ${motif}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const emettre = process.argv.includes("--emettre");
  console.info(`# Validation staging — bascule Luna → Sonnet\n`);

  if (process.env.MOCK_AI !== "false") refuser("MOCK_AI=false requis.");
  if (process.env.AI_ENABLED !== "true") refuser("AI_ENABLED=true requis.");
  if (process.env.AI_FOURNISSEUR !== "openrouter") {
    refuser("AI_FOURNISSEUR=openrouter requis (rien à basculer sinon).");
  }
  if (!process.env.OPENROUTER_API_KEY) refuser("OPENROUTER_API_KEY requis pour le pont primaire.");
  if (!process.env.ANTHROPIC_API_KEY) refuser("ANTHROPIC_API_KEY requis pour le pont de repli.");

  // On force AI_MODEL vers un identifiant inexistant côté OpenRouter.
  // Le pont renvoie 404 « No endpoints found for X », qui devient
  // AICallFailedError côté client, qui déclenche la bascule.
  const modeleOriginal = process.env.AI_MODEL;
  process.env.AI_MODEL = "openai/gpt-inexistant-pour-forcer-la-bascule";
  console.info(`Modèle forcé : ${process.env.AI_MODEL} (identifiant inexistant, provoque 404).`);
  console.info(`Modèle du repli attendu : claude-sonnet-5.\n`);

  if (!emettre) {
    console.info("Rien n'a été émis. Relance avec --emettre pour dépenser (~0,5 ¢).");
    process.env.AI_MODEL = modeleOriginal;
    return;
  }

  const debut = new Date();
  const debutJour = startOfUtcDay(debut);

  console.info(`## Appel primaire (attendu : échec)`);
  try {
    // Un input très court, l'extraction rendra vide ou minimal — peu importe,
    // ce qu'on teste c'est que le repli sert.
    const resultat = await callAI({
      contract: EXTRACT_ATOMS,
      system: SYSTEM_PROMPTS.extract_atoms,
      messages: [{ role: "user", content: "L'eau bout à 100 degrés au niveau de la mer." }],
    });
    console.info(`  ✓ callAI a rendu une valeur : ${resultat.atoms.length} concept(s) extraits — le repli a servi.`);
  } catch (erreur) {
    process.env.AI_MODEL = modeleOriginal;
    console.error(`  ✗ callAI a levé au lieu de basculer :`, erreur);
    process.exitCode = 1;
    return;
  }
  process.env.AI_MODEL = modeleOriginal;

  // Vérification côté registre : la bascule est enregistrée
  console.info(`\n## Vérification du registre`);
  const lignesDuTest = await prisma.aiCall.findMany({
    where: { createdAt: { gte: debut } },
    orderBy: { createdAt: "asc" },
    select: {
      provider: true,
      model: true,
      basculee: true,
      success: true,
      errorCode: true,
    },
  });
  console.info(`  ${lignesDuTest.length} lignes AiCall depuis le début du test :`);
  for (const l of lignesDuTest) {
    console.info(
      `    · provider=${l.provider} model=${l.model} success=${l.success} basculee=${l.basculee}${l.errorCode ? ` errorCode=${l.errorCode}` : ""}`,
    );
  }

  const echecPrimaire = lignesDuTest.find((l) => !l.success && l.provider === "openrouter");
  const succesRepli = lignesDuTest.find((l) => l.success && l.provider === "anthropic" && l.basculee);
  if (!echecPrimaire) refuser("aucun échec sur le pont OpenRouter — le forçage n'a pas déclenché la bascule.");
  if (!succesRepli) refuser("aucun succès Sonnet marqué `basculee=true` — le repli n'a pas servi.");

  console.info(`\n✓ Bascule validée : Luna a échoué (attendu), Sonnet a servi, ligne marquée basculee=true.`);
  void debutJour;
}

main()
  .catch((erreur: unknown) => {
    console.error("Validation interrompue.", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
