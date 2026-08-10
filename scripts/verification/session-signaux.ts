import { prisma } from "@/lib/db/client";
import { desarchiverConcept } from "@/lib/db/concepts";
import { enregistrerRevision, reclamerSignalDeMaitrise } from "@/lib/db/revision";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { JOURS_AVANT_ARCHIVAGE } from "@/lib/domain/etat-maitrise";
import { record } from "./journal";

/**
 * Ce que la session déduit des passages : l'archivage déclaré, et la carte
 * « tu maîtrises ça ».
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

async function conceptSeul(
  userId: string,
  libelle: string,
  maintenant: Date,
): Promise<{ atomId: string; variantId: string }> {
  const input = await prisma.input.create({
    data: {
      userId,
      rawContent: libelle,
      sourceType: "TEXT",
      status: "READY",
      submissionKey: `verif-signal-${libelle}-${Date.now()}`,
    },
    select: { id: true },
  });

  const atome = await prisma.atom.create({
    data: {
      inputId: input.id,
      userId,
      concept: libelle,
      tags: ["signal"],
      due: new Date(maintenant.getTime() - JOUR_MS),
    },
    select: { id: true },
  });

  const variante = await prisma.variant.create({
    data: {
      atomId: atome.id,
      format: "SHORT_ANSWER",
      facet: "RECOGNITION",
      question: `${libelle} ?`,
      answerKey: "Une réponse.",
    },
    select: { id: true },
  });

  return { atomId: atome.id, variantId: variante.id };
}

/** Trois réussites de plus en plus rapides : la carte est méritée. */
async function jouerUneSerie(
  userId: string,
  cible: { atomId: string; variantId: string },
  temps: number[],
  maintenant: Date,
): Promise<boolean> {
  let signalVu = false;
  let instant = maintenant;

  for (const tempsMs of temps) {
    const resultat = await enregistrerRevision(
      { userId, ...cible, note: "GOOD", tempsMs, maitrise: false },
      instant,
    );

    signalVu = Boolean(resultat?.signal);
    instant = new Date(instant.getTime() + JOUR_MS);
  }

  return signalVu;
}

export async function casSignalDeMaitrise(userId: string, maintenant: Date): Promise<void> {
  const accelere = await conceptSeul(userId, "Concept qui accélère", maintenant);
  const ralentit = await conceptSeul(userId, "Concept qui ralentit", maintenant);

  const vuSurAcceleration = await jouerUneSerie(
    userId,
    accelere,
    [12_000, 7_000, 3_000],
    maintenant,
  );
  const vuSurRalentissement = await jouerUneSerie(
    userId,
    ralentit,
    [3_000, 7_000, 12_000],
    maintenant,
  );

  record(
    "Maîtrise — une série qui accélère déclenche le signal",
    vuSurAcceleration,
    vuSurAcceleration ? "signal levé" : "aucun signal",
  );

  record(
    "Maîtrise — une série qui ralentit ne le déclenche pas",
    !vuSurRalentissement,
    vuSurRalentissement ? "signal levé à tort" : "aucun signal",
  );

  // Deux concepts éligibles, une seule carte : la session n'en montre qu'une.
  const premiere = await reclamerSignalDeMaitrise(userId, [accelere.atomId, ralentit.atomId]);
  const seconde = await reclamerSignalDeMaitrise(userId, [accelere.atomId]);

  record(
    "Maîtrise — la carte est réclamée une fois, et une seule",
    premiere?.atomId === accelere.atomId && seconde === null,
    premiere ? `première accordée, seconde ${seconde ? "accordée aussi" : "refusée"}` : "aucune",
  );
}

/** « Je maîtrise ça » : le concept sort du cycle sans sortir de la base. */
export async function casArchivageDeclare(userId: string, maintenant: Date): Promise<void> {
  const cible = await conceptSeul(userId, "Concept déclaré su", maintenant);

  await enregistrerRevision(
    { userId, ...cible, note: "EASY", tempsMs: 2_000, maitrise: true },
    maintenant,
  );

  const atome = await prisma.atom.findUniqueOrThrow({
    where: { id: cible.atomId },
    select: { state: true, archivedByUser: true, archivedAt: true, due: true },
  });

  const joursAvantRetour = Math.round((atome.due.getTime() - maintenant.getTime()) / JOUR_MS);

  record(
    "Archivage — le concept est archivé, et par l'utilisateur",
    atome.state === "ARCHIVED" && atome.archivedByUser && atome.archivedAt !== null,
    `${atome.state}, déclaré par l'utilisateur : ${atome.archivedByUser}`,
  );

  record(
    "Archivage — l'échéance repart à six mois au lieu de disparaître",
    joursAvantRetour === JOURS_AVANT_ARCHIVAGE,
    `revient dans ${joursAvantRetour} jours`,
  );

  const session = await lireSessionDuJour(userId, maintenant);

  record(
    "Archivage — le concept ne revient pas dans la session du jour",
    !session.questions.some((question) => question.atomId === cible.atomId),
    `${session.questions.length} question(s) dans la session`,
  );

  const plusTard = new Date(maintenant.getTime() + (JOURS_AVANT_ARCHIVAGE + 1) * JOUR_MS);
  const retour = await lireSessionDuJour(userId, plusTard);

  record(
    "Archivage — il revient bien six mois plus tard",
    retour.questions.some((question) => question.atomId === cible.atomId),
    `${retour.questions.length} question(s) six mois plus tard`,
  );

  // « L'archivage se défait » : sans ce chemin, un clic sortait un concept pour
  // six mois sans aucun retour possible.
  const demain = new Date(maintenant.getTime() + JOUR_MS);
  const defait = await desarchiverConcept(cible.atomId, userId, demain);
  const remis = await prisma.atom.findUniqueOrThrow({
    where: { id: cible.atomId },
    select: { state: true, archivedByUser: true, archivedAt: true },
  });

  record(
    "Archivage — il se défait, et le concept cesse d'être archivé",
    defait && remis.state !== "ARCHIVED" && !remis.archivedByUser && remis.archivedAt === null,
    `${remis.state}, déclaré : ${remis.archivedByUser}`,
  );

  const aussitot = await lireSessionDuJour(userId, demain);

  record(
    "Archivage — défait, le concept redevient dû tout de suite",
    aussitot.questions.some((question) => question.atomId === cible.atomId),
    aussitot.questions.some((question) => question.atomId === cible.atomId)
      ? "de retour dans la session"
      : "absent de la session",
  );

  record(
    "Archivage — défaire deux fois ne fait rien la seconde",
    !(await desarchiverConcept(cible.atomId, userId, demain)),
    "second appel refusé",
  );
}
