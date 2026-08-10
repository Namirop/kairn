import "dotenv/config";
import { prisma } from "@/lib/db/client";

async function main() {
  const tf = await prisma.variant.findMany({
    where: { format: "TRUE_FALSE" },
    select: { format: true, question: true, answerKey: true, payload: true },
    take: 5,
  });
  for (const v of tf) {
    console.info("---");
    console.info("question :", v.question.slice(0, 70));
    console.info("answerKey:", v.answerKey.slice(0, 70));
    console.info("payload  :", JSON.stringify(v.payload));
  }
  const parFormat = await prisma.variant.groupBy({ by: ["format"], _count: true });
  console.info("=== formats en base ===", JSON.stringify(parFormat));
  await prisma.$disconnect();
}

void main();
