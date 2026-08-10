import { prisma } from "@/lib/db/client";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { record } from "./journal";

/**
 * La même échéance, le même instant, deux fuseaux.
 *
 * C'est l'endroit où les bugs de ce projet seront silencieux : un concept dû
 * pour quelqu'un à Auckland ne l'est pas encore pour quelqu'un à Los Angeles,
 * et une comparaison faite en UTC se tromperait pour les deux.
 */

const AUCKLAND = "Pacific/Auckland";
const LOS_ANGELES = "America/Los_Angeles";

export async function casDeuxFuseaux(userId: string): Promise<void> {
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: "Support du cas fuseaux.",
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-fuseaux-${Date.now()}`,
    },
    select: { id: true },
  });

  // 15 juin, 10 h 00 UTC. À Auckland il est déjà le 15 à 22 h ; à Los Angeles
  // il n'est que le 15 à 3 h du matin. Une échéance posée au 15 à 20 h UTC
  // tombe donc le 16 pour Auckland et le 15 pour Los Angeles.
  const maintenant = new Date("2026-06-15T10:00:00Z");
  const echeance = new Date("2026-06-15T20:00:00Z");

  const atome = await prisma.atom.create({
    data: { inputId: input.id, userId, concept: "Concept à cheval sur deux jours", due: echeance },
    select: { id: true },
  });

  await prisma.variant.create({
    data: {
      atomId: atome.id,
      format: "SHORT_ANSWER",
      facet: "RECOGNITION",
      question: "Question du cas fuseaux ?",
      answerKey: "Une réponse.",
    },
  });

  await prisma.userSettings.update({ where: { userId }, data: { timezone: AUCKLAND } });
  const aAuckland = await lireSessionDuJour(userId, maintenant);

  await prisma.userSettings.update({ where: { userId }, data: { timezone: LOS_ANGELES } });
  const aLosAngeles = await lireSessionDuJour(userId, maintenant);

  const dueAAuckland = aAuckland.questions.some((question) => question.atomId === atome.id);
  const dueALosAngeles = aLosAngeles.questions.some((question) => question.atomId === atome.id);

  record(
    "Fuseaux — à l'est de l'UTC, l'échéance du soir est déjà demain, donc pas due",
    !dueAAuckland,
    dueAAuckland ? "comptée comme due" : "reportée au lendemain",
  );

  record(
    "Fuseaux — à l'ouest, la même échéance tombe aujourd'hui, donc due",
    dueALosAngeles,
    dueALosAngeles ? "comptée comme due" : "pas due, à tort",
  );

  record(
    "Fuseaux — le même instant ne donne donc pas la même session",
    dueAAuckland !== dueALosAngeles,
    `Auckland : ${dueAAuckland ? "due" : "pas due"}, Los Angeles : ${dueALosAngeles ? "due" : "pas due"}`,
  );

  // On remet le fuseau de travail et on retire le concept : les cas suivants
  // comptent les questions dues, ils ne doivent pas hériter de celui-ci.
  await prisma.userSettings.update({ where: { userId }, data: { timezone: "Europe/Paris" } });
  await prisma.input.delete({ where: { id: input.id } });
}
