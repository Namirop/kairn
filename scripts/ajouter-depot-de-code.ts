import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { CORPUS_CODE } from "@/prisma/seed/corpus-code";
import { writeCorpus } from "@/prisma/seed/corpus-writer";

/**
 * Ajoute le dépôt de code à un compte existant, pour regarder le rendu des
 * termes techniques sur de vraies questions.
 *
 * Il ne passe pas par le modèle : les concepts et les questions sont écrits dans
 * `corpus-code.ts`, comme ceux du seed. C'est le seul moyen d'avoir un corpus de
 * code stable — deux générations réelles ne rendraient pas les mêmes questions,
 * et on ne saurait plus si un affichage a changé ou si c'est le texte.
 *
 * Usage : `npm run depot:code -- moi@exemple.fr`
 *
 * Relancé, il remplace le dépôt qu'il avait écrit — reconnu à son contenu, sur ce
 * compte-là seulement — pour ne pas empiler les doublons.
 */
async function main(): Promise<void> {
  const email = process.argv[2];

  if (!email) {
    throw new Error("Adresse du compte attendue : npm run depot:code -- moi@exemple.fr");
  }

  const compte = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (!compte) throw new Error(`Aucun compte pour ${email}.`);

  const contenus = CORPUS_CODE.map((depot) => depot.rawContent);
  const { count } = await prisma.input.deleteMany({
    where: { userId: compte.id, rawContent: { in: contenus } },
  });

  if (count > 0) console.info(`${count} dépôt de code déjà présent, remplacé.`);

  const { reviewedAt } = await writeCorpus(compte.id, CORPUS_CODE, new Date());

  const [concepts, questions, dus] = await Promise.all([
    prisma.atom.count({ where: { userId: compte.id, input: { rawContent: { in: contenus } } } }),
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
