import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { CORPUS_CODE } from "@/prisma/seed/corpus-code";
import { writeCorpus } from "@/prisma/seed/corpus-writer";

/**
 * Ajoute le dépôt de code à un compte existant, pour regarder le rendu des
 * termes techniques sur de vraies questions.
 *
 * Sans modèle : concepts et questions sont écrits dans `corpus-code.ts`, pour
 * un corpus stable — deux générations réelles ne rendraient pas les mêmes
 * questions, et on ne saurait plus si c'est l'affichage ou le texte qui change.
 *
 * Usage : `npm run depot:code -- moi@exemple.fr`
 *
 * Relancé, il remplace le dépôt qu'il avait écrit sur ce compte, reconnu à sa
 * première ligne : corriger une phrase du corpus ne doit pas laisser la
 * version d'avant.
 */
async function main(): Promise<void> {
  const email = process.argv[2];

  if (!email) {
    throw new Error("Adresse du compte attendue : npm run depot:code -- moi@exemple.fr");
  }

  const compte = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (!compte) throw new Error(`Aucun compte pour ${email}.`);

  // Le titre du corpus, qui ne bouge pas quand son corps est corrigé.
  const entetes = CORPUS_CODE.map((depot) => depot.rawContent.split("\n")[0] ?? depot.rawContent);
  const deja = await prisma.input.findMany({
    where: {
      userId: compte.id,
      OR: entetes.map((entete) => ({ rawContent: { startsWith: entete } })),
    },
    select: { id: true },
  });

  if (deja.length > 0) {
    await prisma.input.deleteMany({ where: { id: { in: deja.map((depot) => depot.id) } } });
    console.info(`${deja.length} dépôt de code déjà présent, remplacé.`);
  }

  const { reviewedAt } = await writeCorpus(compte.id, CORPUS_CODE, new Date());

  const [concepts, questions, dus] = await Promise.all([
    prisma.atom.count({
      where: {
        userId: compte.id,
        OR: entetes.map((entete) => ({ input: { rawContent: { startsWith: entete } } })),
      },
    }),
    prisma.variant.count({ where: { atom: { userId: compte.id } } }),
    prisma.atom.count({
      where: { userId: compte.id, due: { lte: new Date() }, state: { not: "ARCHIVED" } },
    }),
  ]);

  console.info(
    `Dépôt de code écrit pour ${email} — ${concepts} concepts, ${reviewedAt.length} passages ` +
      `rejoués, ${questions} questions sur le compte, ${dus} concepts dus maintenant.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Le dépôt de code n'a pas été écrit.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
