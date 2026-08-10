import { submitAIBatch } from "@/lib/ai/batch";
import { EXTRACT_ATOMS, GENERATE_VARIANTS } from "@/lib/ai/schemas";
import { callAI } from "@/lib/ai/client";
import { prisma } from "@/lib/db/client";
import { lireReservationsDuJour, reserverAppelsModele } from "@/lib/db/ai-quota";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";
import { expectFailure, record } from "./journal";

/**
 * Le plafond journalier, éprouvé sur l'appel unitaire comme sur l'envoi groupé.
 *
 * Le compteur du jour est amené à saturation puis remis exactement dans l'état
 * où il était : la vérification ne doit consommer aucune vraie place. La tenue
 * sous concurrence est prouvée séparément, sur un jour sentinelle, par
 * scripts/verifier-plafond-concurrent.ts.
 */

const SATURE = 3;

function requeteGroupee(reference: string) {
  return {
    reference,
    contract: GENERATE_VARIANTS,
    system: "",
    messages: [{ role: "user" as const, content: "Concept 1.\nUn concept de vérification." }],
  };
}

export async function verifierPlafond(): Promise<void> {
  const jour = dayToUtcDate(localDay(new Date(), "UTC"));
  const avant = await prisma.aiCallQuota.findUnique({ where: { day: jour } });

  await prisma.aiCallQuota.upsert({
    where: { day: jour },
    create: { day: jour, reserved: SATURE },
    update: { reserved: SATURE },
  });

  try {
    process.env.AI_ENABLED = "true";
    process.env.MOCK_AI = "true";
    process.env.AI_DAILY_CALL_CAP = String(SATURE);

    // Le mode mock ne dépense rien : il ne doit donc rien réserver, sans quoi
    // une journée de développement viderait le plafond du jour.
    const simule = await submitAIBatch([requeteGroupee("mock-1"), requeteGroupee("mock-2")]);
    record(
      "Un lot simulé n'entame pas le plafond du jour",
      (await lireReservationsDuJour()) === SATURE && simule.requetes === 2,
      `compteur à ${await lireReservationsDuJour()} après ${simule.requetes} requêtes simulées`,
    );

    process.env.MOCK_AI = "false";
    await expectFailure("Le plafond journalier refuse avant d'émettre", "AI_QUOTA", () =>
      callAI({
        contract: EXTRACT_ATOMS,
        system: "",
        messages: [{ role: "user", content: "test" }],
      }),
    );

    await expectFailure("Le plafond journalier refuse aussi un envoi groupé", "AI_QUOTA", () =>
      submitAIBatch([requeteGroupee("lot-1"), requeteGroupee("lot-2")]),
    );

    record(
      "Un refus n'entame pas le compteur",
      (await lireReservationsDuJour()) === SATURE,
      `compteur à ${await lireReservationsDuJour()}`,
    );

    // Un lot prend ses places toutes ensemble ou aucune : à deux places libres,
    // un lot de trois requêtes est refusé en entier.
    const troisSurDeux = await reserverAppelsModele(SATURE + 2, 3);
    const deuxSurDeux = await reserverAppelsModele(SATURE + 2, 2);
    record(
      "Un lot réserve ses places d'un bloc, ou aucune",
      !troisSurDeux.obtenue && deuxSurDeux.obtenue && deuxSurDeux.utilisees === SATURE + 2,
      `trois refusées, puis deux accordées jusqu'à ${deuxSurDeux.utilisees}`,
    );
  } finally {
    if (avant) {
      await prisma.aiCallQuota.update({ where: { day: jour }, data: { reserved: avant.reserved } });
    } else {
      await prisma.aiCallQuota.delete({ where: { day: jour } });
    }
  }
}
