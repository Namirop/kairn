import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/client";
import { enregistrerEntrainement } from "@/lib/db/entrainement";
import { enregistrerRevision } from "@/lib/db/revision";
import { listerLesSignalements, signalerUneQuestion } from "@/lib/db/signalement";
import { estAdministrateur } from "@/lib/auth/admin";
import { PROMPT_VERSIONS } from "@/lib/ai/prompts";
import { fabriquerConcept } from "./abus-fabrique";
import { record } from "./journal";

/**
 * Ce que la phase 4 ajoute au moteur : la progression comptée, et la trace
 * qu'un signalement laisse.
 *
 * Deux garanties qui se cassent en silence. Une progression qui compterait
 * l'entraînement rouvrirait par la porte de service ce qu'on a fermé en 3.5 ; un
 * signalement qui disparaîtrait avec le concept effacerait exactement celui
 * qu'on voulait lire — supprimer le concept est le geste qui suit une question
 * fausse.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

async function statsDe(userId: string) {
  return prisma.userStats.findUnique({ where: { userId } });
}

/** Un passage de session sur un concept fabriqué, à l'instant qu'on veut. */
async function reviser(
  userId: string,
  concept: { atomId: string; variantIds: string[] },
  note: "AGAIN" | "GOOD",
  instant: Date,
  rang = 0,
) {
  return enregistrerRevision(
    {
      userId,
      atomId: concept.atomId,
      variantId: concept.variantIds[rang] ?? "",
      note,
      tempsMs: 4000,
      maitrise: false,
    },
    instant,
  );
}

export async function casProgressionComptee(userId: string, maintenant: Date): Promise<void> {
  await prisma.userStats.deleteMany({ where: { userId } });
  await prisma.input.deleteMany({ where: { userId } });

  const premier = await fabriquerConcept(userId, { libelle: "Un concept qu'on révise" });
  await reviser(userId, premier, "GOOD", maintenant);

  const apresUn = await statsDe(userId);
  record(
    "Progression — un passage de session vaut un point, quelle que soit la note",
    apresUn?.xp === 1 && apresUn?.currentStreak === 1 && apresUn?.level === 1,
    `${apresUn?.xp} XP, série ${apresUn?.currentStreak}, niveau ${apresUn?.level}`,
  );

  // Raté au passage précédent, retrouvé maintenant : c'est le seul endroit où le
  // résultat compte, et il ne compte que pour récompenser d'être revenu.
  const second = await fabriquerConcept(userId, { libelle: "Un concept qu'on rate puis retrouve" });
  await reviser(userId, second, "AGAIN", maintenant, 0);
  const avantRattrapage = await statsDe(userId);
  await reviser(userId, second, "GOOD", new Date(maintenant.getTime() + JOUR_MS), 1);
  const apresRattrapage = await statsDe(userId);

  record(
    "Progression — un concept raté puis retrouvé rapporte le double",
    (apresRattrapage?.xp ?? 0) - (avantRattrapage?.xp ?? 0) === 2,
    `+${(apresRattrapage?.xp ?? 0) - (avantRattrapage?.xp ?? 0)} point(s)`,
  );

  const avantEntrainement = await statsDe(userId);
  await enregistrerEntrainement(
    {
      userId,
      atomId: premier.atomId,
      variantId: premier.variantIds[2] ?? "",
      note: "GOOD",
      tempsMs: 3000,
    },
    new Date(maintenant.getTime() + 2 * JOUR_MS),
  );
  const apresEntrainement = await statsDe(userId);

  record(
    "Progression — l'entraînement ne donne ni point, ni série",
    apresEntrainement?.xp === avantEntrainement?.xp &&
      apresEntrainement?.currentStreak === avantEntrainement?.currentStreak &&
      apresEntrainement?.lastReviewedOn?.getTime() === avantEntrainement?.lastReviewedOn?.getTime(),
    `${apresEntrainement?.xp} XP et série ${apresEntrainement?.currentStreak}, inchangées`,
  );

  // Le module de progression ne doit pas être atteignable depuis l'entraînement :
  // la garantie la plus solide qu'on puisse lui donner est qu'il ne l'importe pas.
  const entrainement = readFileSync("lib/db/entrainement.ts", "utf8");
  record(
    "Progression — le chemin de l'entraînement ne connaît pas le compteur",
    !entrainement.includes("progression"),
    entrainement.includes("progression") ? "il l'importe" : "aucun import",
  );
}

/**
 * La série se compte en jours civils de l'utilisateur.
 *
 * Deux passages séparés de vingt minutes autour de minuit à Paris : ce sont deux
 * jours pour lui, un seul en UTC. C'est son calendrier qui décide.
 */
export async function casSerieAutourDeMinuit(userId: string): Promise<void> {
  await prisma.userStats.deleteMany({ where: { userId } });
  await prisma.input.deleteMany({ where: { userId } });

  const concept = await fabriquerConcept(userId, { libelle: "Un concept révisé à cheval" });

  // 22 h 50 UTC = 23 h 50 à Paris le 10 ; 23 h 10 UTC = 00 h 10 le 11.
  await reviser(userId, concept, "GOOD", new Date("2026-03-10T22:50:00Z"), 0);
  const veille = await statsDe(userId);
  await reviser(userId, concept, "GOOD", new Date("2026-03-10T23:10:00Z"), 1);
  const lendemain = await statsDe(userId);

  record(
    "Série — vingt minutes à cheval sur minuit local comptent deux jours",
    veille?.currentStreak === 1 && lendemain?.currentStreak === 2,
    `${veille?.currentStreak} puis ${lendemain?.currentStreak}`,
  );

  // Un troisième passage le même jour local ne rallonge rien : revenir suffit,
  // mais revenir deux fois dans la journée ne compte pas double.
  await reviser(userId, concept, "GOOD", new Date("2026-03-11T09:00:00Z"), 2);
  const memeJour = await statsDe(userId);

  record(
    "Série — deux passages le même jour ne comptent qu'une fois",
    memeJour?.currentStreak === 2,
    `série ${memeJour?.currentStreak}`,
  );
}

export async function casSignalementTrace(userId: string): Promise<void> {
  await prisma.signalement.deleteMany({ where: { userId } });
  await prisma.input.deleteMany({ where: { userId } });

  const concept = await fabriquerConcept(userId, {
    libelle: "Un concept dont la question est fausse",
  });
  const variantId = concept.variantIds[0] ?? "";

  // La fabrique écrit ses variantes à la main : on leur pose le réglage que le
  // pipeline aurait posé, pour éprouver la capture et non la fabrique.
  await prisma.variant.update({
    where: { id: variantId },
    data: { promptVersion: PROMPT_VERSIONS.generate_variants, model: "claude-sonnet-5" },
  });

  const ecrit = await signalerUneQuestion(
    { userId, variantId, motif: "FAUSSE", commentaire: "Ce n'est pas ce que dit ma source." },
    new Date(),
  );
  const retiree = await prisma.variant.findUniqueOrThrow({ where: { id: variantId } });

  record(
    "Signalement — la question signalée sort du tirage, sans rien régénérer",
    ecrit && retiree.retiredAt !== null,
    ecrit ? "retirée, aucune demande de questions" : "refusé",
  );

  const avant = (await listerLesSignalements()).find((ligne) => ligne.atomId === concept.atomId);

  record(
    "Signalement — la version des prompts est capturée",
    avant?.promptVersion === PROMPT_VERSIONS.generate_variants &&
      avant?.model === "claude-sonnet-5",
    `prompt ${avant?.promptVersion ?? "absent"}, modèle ${avant?.model ?? "absent"}`,
  );

  // Le geste qui suit une question fausse, et celui qui emportait le signalement.
  await prisma.atom.delete({ where: { id: concept.atomId } });
  const apres = (await listerLesSignalements()).find((ligne) => ligne.id === avant?.id);

  record(
    "Signalement — il survit à la suppression du concept, et le dit",
    apres !== undefined &&
      apres.conceptExisteEncore === false &&
      apres.question.length > 0 &&
      apres.concept.length > 0,
    apres === undefined
      ? "emporté avec le concept"
      : `conservé, concept ${apres.conceptExisteEncore ? "présent" : "supprimé"}`,
  );

  await prisma.signalement.deleteMany({ where: { userId } });
}

/** L'écran des signalements ne s'ouvre qu'à un compte autorisé. */
export function casAdministrationFermee(): void {
  const reglages = process.env.ADMIN_EMAILS;

  process.env.ADMIN_EMAILS = "romain@exemple.test, AUTRE@exemple.test";

  const verdicts = [
    ["l'adresse listée passe", estAdministrateur("romain@exemple.test")],
    ["la casse et les espaces ne changent rien", estAdministrateur("  Autre@Exemple.Test ")],
    ["une autre adresse est refusée", !estAdministrateur("quelquun@exemple.test")],
    ["une session sans adresse est refusée", !estAdministrateur(null)],
  ] as const;

  process.env.ADMIN_EMAILS = "";
  const fermeParDefaut = !estAdministrateur("romain@exemple.test");

  if (reglages === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = reglages;

  const rates = verdicts.filter(([, ok]) => !ok).map(([libelle]) => libelle);

  record(
    "Administration — seule une adresse autorisée ouvre les signalements",
    rates.length === 0 && fermeParDefaut,
    rates.length === 0
      ? "liste vide comprise : elle n'autorise personne"
      : `échecs : ${rates.join(", ")}`,
  );

  // La garde doit être sur la page elle-même, pas seulement dans le lien qui y
  // mène : une URL se tape à la main.
  // L'ancienne adresse compte autant que la nouvelle : un renvoi non gardé
  // apprendrait à n'importe qui que l'écran existe, et à quelle adresse.
  const pages = ["app/(app)/admin/page.tsx", "app/(app)/signalements/page.tsx"];
  const nues = pages.filter((chemin) => {
    const source = readFileSync(chemin, "utf8");

    return !(source.includes("estAdministrateur") && source.includes("notFound"));
  });

  record(
    "Administration — la page se garde elle-même, et n'admet pas son existence",
    nues.length === 0,
    nues.length === 0 ? "404 pour qui n'y a pas droit, ancienne adresse comprise" : nues.join(", "),
  );
}
