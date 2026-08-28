import "dotenv/config";
import { prisma } from "@/lib/db/client";

async function main() {
  const userId = "bAmaHWtzQKQoaSfgmQkWVRMz0xoPMdXy";
  const atomes = await prisma.atom.findMany({
    where: { userId },
    select: {
      id: true, concept: true, tags: true, uncertain: true, state: true, due: true,
      variants: {
        orderBy: { createdAt: "asc" },
        select: { id: true, format: true, facet: true, question: true, answerKey: true, payload: true, retiredAt: true, sessionCount: true, createdAt: true },
      },
    },
  });

  for (const a of atomes) {
    console.log(`\n■ ${a.concept.slice(0, 70)}  [${a.tags.join(", ")}] ${a.state}${a.uncertain ? " DOUTEUX" : ""}`);
    for (const v of a.variants) {
      const q = v.question ?? "";
      const r = v.answerKey ?? "";
      console.log(`   ${v.facet.padEnd(12)} ${v.format.padEnd(13)} n=${v.sessionCount} ${v.retiredAt ? "RETIRÉ " : ""}q=${q.length} r=${r.length} ${JSON.stringify(q.slice(0, 60))}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
