import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { choisirVariante } from "@/lib/domain/rotation-variantes";

async function main() {
  const userId = "seed-compte-demonstration";
  const atomes = await prisma.atom.findMany({
    where: { userId, uncertain: false, variants: { some: { retiredAt: null } } },
    select: {
      id: true,
      concept: true,
      due: true,
      variants: {
        where: { retiredAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, format: true, facet: true, sessionCount: true, trainingCount: true, lastSessionAt: true, question: true, answerKey: true },
      },
      reviews: { orderBy: { reviewedAt: "desc" }, take: 1, select: { variant: { select: { facet: true } } } },
    },
  });

  console.log(`${atomes.length} concept(s) avec questions\n`);
  const servis: string[] = [];

  for (const a of atomes) {
    const derniere = a.reviews[0]?.variant.facet ?? null;
    const choisie = choisirVariante(a.variants, derniere);
    servis.push(choisie ? `${choisie.facet}/${a.variants.find((v) => v.id === choisie.id)?.format}` : "—");
    const ordre = a.variants.map((v) => `${v.facet}:${v.format}(${v.sessionCount})`).join(" ");
    console.log(`• ${a.concept.slice(0, 46).padEnd(48)} ${ordre}`);
  }

  console.log("\nCe que la session servirait :");
  const compte = new Map<string, number>();
  for (const s of servis) compte.set(s, (compte.get(s) ?? 0) + 1);
  for (const [cle, n] of [...compte].sort((x, y) => y[1] - x[1])) console.log(`   ${n.toString().padStart(2)} × ${cle}`);

  const vides = await prisma.variant.count({ where: { OR: [{ question: "" }, { answerKey: "" }] } });
  console.log(`\nQuestions ou réponses vides en base : ${vides}`);
}
main().finally(() => prisma.$disconnect());
