import { prisma } from "@/lib/db/client";
import type { AtomState, ReviewRating } from "@/lib/db/types";
import { dayToUtcDate, localDay } from "@/lib/domain/local-day";

/**
 * Le décor des vérifications d'abus : des comptes, des concepts posés à la
 * main, et un mode compteur qui dit combien d'appels seraient réellement partis.
 *
 * Les concepts sont écrits directement en base plutôt que déposés : ces
 * vérifications éprouvent le cycle de vie et les compteurs, pas l'extraction.
 * Passer par un dépôt ferait dépendre chaque cas d'une fixture et du quota du
 * jour, pour un décor qu'on veut exact.
 */

export const FACETTES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

export async function creerCompte(id: string, fuseau = "Europe/Paris"): Promise<string> {
  await prisma.user.deleteMany({ where: { id } });

  const cree = await prisma.user.create({
    data: {
      id,
      email: `${id}@cairn.test`,
      name: id,
      emailVerified: true,
      settings: { create: { timezone: fuseau } },
    },
    select: { id: true },
  });

  return cree.id;
}

export async function effacerComptes(ids: string[]): Promise<void> {
  await prisma.aiCall.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

/** Table rase sur un compte, sans le détruire : chaque cas part du même vide. */
export async function viderLeCompte(userId: string): Promise<void> {
  await prisma.input.deleteMany({ where: { userId } });
  await prisma.dailyUsage.deleteMany({ where: { userId } });
  await prisma.aiUserQuota.deleteMany({ where: { userId } });
  await prisma.waitlistEntry.deleteMany({ where: { userId } });
}

export type ConceptFabrique = { inputId: string; atomId: string; variantIds: string[] };

export type Fabrication = {
  libelle?: string;
  due?: Date;
  lastReview?: Date | null;
  state?: AtomState;
  archivedByUser?: boolean;
  archivedAt?: Date | null;
  scheduledDays?: number;
  /** Faux pour un concept qui n'a pas encore de question écrite. */
  questions?: boolean;
};

export async function fabriquerConcept(
  userId: string,
  options: Fabrication = {},
): Promise<ConceptFabrique> {
  const libelle = options.libelle ?? "Concept de vérification";
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: libelle,
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-abus-${Math.random().toString(36).slice(2, 12)}`,
    },
    select: { id: true },
  });

  const atome = await prisma.atom.create({
    data: {
      inputId: input.id,
      userId,
      concept: libelle,
      tags: [],
      due: options.due ?? new Date(),
      lastReview: options.lastReview ?? null,
      state: options.state ?? "LEARNING",
      archivedByUser: options.archivedByUser ?? false,
      archivedAt: options.archivedAt ?? null,
      scheduledDays: options.scheduledDays ?? 0,
      stability: options.scheduledDays ?? 0,
      fsrsState: options.scheduledDays ? "REVIEW" : "NEW",
      reps: options.scheduledDays ? 4 : 0,
    },
    select: { id: true },
  });

  const variantIds: string[] = [];

  if (options.questions !== false) {
    for (const facet of FACETTES) {
      const variante = await prisma.variant.create({
        data: {
          atomId: atome.id,
          format: "SHORT_ANSWER",
          facet,
          question: `${libelle} — ${facet} ?`,
          answerKey: "Une réponse.",
        },
        select: { id: true },
      });

      variantIds.push(variante.id);
    }
  }

  return { inputId: input.id, atomId: atome.id, variantIds };
}

/** Des passages déjà écrits, pour un concept qui a une histoire. */
export async function ajouterPassages(
  userId: string,
  concept: ConceptFabrique,
  notes: readonly ReviewRating[],
  depart: Date,
): Promise<void> {
  for (const [rang, note] of notes.entries()) {
    await prisma.review.create({
      data: {
        atomId: concept.atomId,
        variantId: concept.variantIds[rang % concept.variantIds.length] ?? "",
        userId,
        rating: note,
        responseTimeMs: 5000,
        mode: "SESSION",
        stabilityBefore: 10,
        stabilityAfter: 12,
        reviewedAt: new Date(depart.getTime() + rang * 60_000),
      },
    });
  }
}

export type Comptage<T> = {
  resultat: T;
  /** Appels réellement émis — une ligne au registre par émission tentée. */
  appels: number;
  /** Places prises au plafond global du jour. */
  places: number;
};

/**
 * Le mode compteur : mock coupé, clé retirée, base de l'API renvoyée sur un
 * port fermé.
 *
 * Le mode mock ne réserve rien et n'écrit rien au registre — il ne peut donc
 * pas dire combien d'appels seraient partis. On coupe donc le mock pour que
 * `callAI()` fasse ce qu'il fait en vrai : réserver sa place au plafond global,
 * émettre, écrire sa ligne. L'émission, elle, ne va nulle part — pas de clé,
 * et une base pointée sur `127.0.0.1:9`. Ce qui se compte ici, c'est ce que le
 * produit aurait facturé.
 *
 * Ce que ce mode touche au plafond global du jour est rendu à la fin, et les
 * lignes écrites au registre sont effacées : une vérification ne consomme pas
 * de vraies places.
 */
export async function enModeCompteur<T>(
  plafond: number,
  action: () => Promise<T>,
): Promise<Comptage<T>> {
  const jour = dayToUtcDate(localDay(new Date(), "UTC"));
  const avant = await prisma.aiCallQuota.findUnique({ where: { day: jour } });
  const debut = new Date();

  const reglages = {
    MOCK_AI: process.env.MOCK_AI,
    AI_DAILY_CALL_CAP: process.env.AI_DAILY_CALL_CAP,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  };

  process.env.MOCK_AI = "false";
  process.env.AI_DAILY_CALL_CAP = String(plafond);
  delete process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:9";

  try {
    const resultat = await action();
    const appels = await prisma.aiCall.count({ where: { createdAt: { gte: debut } } });
    const apres = await prisma.aiCallQuota.findUnique({ where: { day: jour } });

    return { resultat, appels, places: (apres?.reserved ?? 0) - (avant?.reserved ?? 0) };
  } finally {
    for (const [nom, valeur] of Object.entries(reglages)) {
      if (valeur === undefined) delete process.env[nom];
      else process.env[nom] = valeur;
    }

    await prisma.aiCall.deleteMany({ where: { createdAt: { gte: debut } } });
    // Les parts de compte, elles, ne sont pas touchées ici : elles appartiennent
    // à un compte, et c'est sa suppression qui les emporte. Les effacer par
    // journée reviendrait à rendre leurs places à des comptes qu'on n'a pas
    // regardés.

    if (avant) {
      await prisma.aiCallQuota.update({ where: { day: jour }, data: { reserved: avant.reserved } });
    } else {
      await prisma.aiCallQuota.deleteMany({ where: { day: jour } });
    }
  }
}
