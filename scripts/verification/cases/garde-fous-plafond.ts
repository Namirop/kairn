import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { callAI } from "@/lib/ai/client";
import { prisma } from "@/lib/db/client";
import { readAiConfig } from "@/lib/ai/config";
import { reserverLesDeuxPlaces } from "@/lib/ai/reservation";
import { lireReservationsDuJour, reserverAppelsModele } from "@/lib/db/ai-quota";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";
import { expectFailure, record } from "./journal";

/**
 * Le plafond journalier, éprouvé sur l'appel au modèle. Le compteur du jour est
 * saturé puis remis exactement dans son état : aucune vraie place n'est
 * consommée. La tenue sous concurrence est prouvée par
 * `verifier-plafond-concurrent.ts`.
 */

const SATURE = 3;

/**
 * Les comptes et le trafic sans compte ne s'affament pas l'un l'autre : sans
 * part propre, la landing pourrait fermer la journée aux comptes, et
 * inversement. Un déni de service croisé, invisible à la relecture.
 *
 * Éprouvé sur `reserverLesDeuxPlaces` et non sur `callAI` : montrer qu'un appel
 * passe demanderait de l'émettre.
 */
export async function verifierPartAnonyme(): Promise<void> {
  const jour = dayToUtcDate(localDay(new Date(), "UTC"));
  const avantGlobal = await prisma.aiCallQuota.findUnique({ where: { day: jour } });
  const avantAnonyme = await prisma.aiAnonymousQuota.findUnique({ where: { day: jour } });
  const compte = await prisma.user.findFirst({ select: { id: true } });

  const config = {
    ...readAiConfig(),
    dailyCallCap: 1000,
    userDailyCallCap: 2,
    anonymousDailyCallCap: 2,
  };

  const avantCompte = compte
    ? await prisma.aiUserQuota.findUnique({
        where: { userId_day: { userId: compte.id, day: jour } },
      })
    : null;

  try {
    await prisma.aiCallQuota.upsert({
      where: { day: jour },
      create: { day: jour },
      update: { reserved: 0 },
    });
    await prisma.aiAnonymousQuota.upsert({
      where: { day: jour },
      create: { day: jour, reserved: config.anonymousDailyCallCap },
      update: { reserved: config.anonymousDailyCallCap },
    });

    await expectFailure(
      "La part du trafic sans compte refuse quand elle est pleine",
      "AI_ANONYMOUS_QUOTA",
      () => reserverLesDeuxPlaces(config, { anonyme: true }),
    );

    // La landing est pleine, et le reste doit servir.
    if (compte) {
      await prisma.aiUserQuota.deleteMany({ where: { userId: compte.id, day: jour } });
    }

    const compteServi = compte
      ? await passe(() => reserverLesDeuxPlaces(config, { userId: compte.id }))
      : null;
    const interneServi = await passe(() => reserverLesDeuxPlaces(config, { interne: true }));

    record(
      "La landing pleine ne ferme la journée à personne d'autre",
      interneServi && compteServi !== false,
      `appel interne ${interneServi ? "servi" : "refusé"}, compte ${
        compteServi === null ? "non éprouvé (aucun en base)" : compteServi ? "servi" : "refusé"
      }`,
    );

    // Et l'inverse : un compte qui sature sa part ne ferme pas la landing.
    await prisma.aiAnonymousQuota.update({ where: { day: jour }, data: { reserved: 0 } });

    if (compte) {
      await prisma.aiUserQuota.upsert({
        where: { userId_day: { userId: compte.id, day: jour } },
        create: { userId: compte.id, day: jour, reserved: config.userDailyCallCap },
        update: { reserved: config.userDailyCallCap },
      });

      await expectFailure("La part d'un compte plein refuse ce compte", "AI_USER_QUOTA", () =>
        reserverLesDeuxPlaces(config, { userId: compte.id }),
      );
    }

    const essaiServi = await passe(() => reserverLesDeuxPlaces(config, { anonyme: true }));

    record(
      "Un compte qui sature sa part ne ferme pas la landing",
      essaiServi,
      `essai sans compte ${essaiServi ? "servi" : "refusé"} alors que la part d'un compte est pleine`,
    );
  } finally {
    await reposerGlobal(jour, avantGlobal?.reserved);
    await reposerAnonyme(jour, avantAnonyme?.reserved);

    if (compte) {
      await prisma.aiUserQuota.deleteMany({ where: { userId: compte.id, day: jour } });

      if (avantCompte) {
        await prisma.aiUserQuota.create({
          data: { userId: compte.id, day: jour, reserved: avantCompte.reserved },
        });
      }
    }
  }
}

/** La réservation est-elle passée ? Un refus lève, et c'est ce qu'on lit. */
async function passe(reserver: () => Promise<void>): Promise<boolean> {
  try {
    await reserver();

    return true;
  } catch {
    return false;
  }
}

async function reposerGlobal(jour: Date, reserved: number | undefined): Promise<void> {
  if (reserved === undefined) {
    await prisma.aiCallQuota.deleteMany({ where: { day: jour } });

    return;
  }

  await prisma.aiCallQuota.upsert({
    where: { day: jour },
    create: { day: jour, reserved },
    update: { reserved },
  });
}

async function reposerAnonyme(jour: Date, reserved: number | undefined): Promise<void> {
  if (reserved === undefined) {
    await prisma.aiAnonymousQuota.deleteMany({ where: { day: jour } });

    return;
  }

  await prisma.aiAnonymousQuota.upsert({
    where: { day: jour },
    create: { day: jour, reserved },
    update: { reserved },
  });
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

    // Hors mock, sinon `callAI` rend la fixture avant la réservation. Rien ne
    // sort : le piège sur `fetch` de `verifier-garde-fous.ts` le garantit.
    process.env.MOCK_AI = "false";
    await expectFailure("Le plafond journalier refuse avant d'émettre", "AI_QUOTA", () =>
      callAI({
        contract: EXTRACT_ATOMS,
        system: "",
        messages: [{ role: "user", content: "test" }],
      }),
    );

    record(
      "Un refus n'entame pas le compteur",
      (await lireReservationsDuJour()) === SATURE,
      `compteur à ${await lireReservationsDuJour()}`,
    );

    // Une réservation multiple prend ses places toutes ensemble ou aucune : à
    // deux places libres, une demande de trois est refusée en entier.
    const troisSurDeux = await reserverAppelsModele(SATURE + 2, 3);
    const deuxSurDeux = await reserverAppelsModele(SATURE + 2, 2);
    record(
      "Une réservation multiple prend ses places d'un bloc, ou aucune",
      !troisSurDeux.obtenue && deuxSurDeux.obtenue && deuxSurDeux.utilisees === SATURE + 2,
      `trois refusées, puis deux accordées jusqu'à ${deuxSurDeux.utilisees}`,
    );

    // La première réservation d'une journée UTC insère sa ligne sans passer par
    // la condition de plafond : une demande plus grosse que le plafond entier
    // s'y installerait juste après minuit.
    await prisma.aiCallQuota.deleteMany({ where: { day: jour } });

    const plusGrosQueLePlafond = await reserverAppelsModele(SATURE, SATURE + 1);
    record(
      "Une demande plus grosse que le plafond est refusée, même sur une journée vierge",
      !plusGrosQueLePlafond.obtenue && (await lireReservationsDuJour()) === 0,
      `compteur à ${await lireReservationsDuJour()} après une demande de ${SATURE + 1} sur ${SATURE}`,
    );
  } finally {
    // Le compteur peut avoir été effacé au-dessus : on le repose tel qu'il était.
    if (avant) {
      await prisma.aiCallQuota.upsert({
        where: { day: jour },
        create: { day: jour, reserved: avant.reserved },
        update: { reserved: avant.reserved },
      });
    } else {
      await prisma.aiCallQuota.deleteMany({ where: { day: jour } });
    }
  }
}
