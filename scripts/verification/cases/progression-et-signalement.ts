import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db/client";
import { enregistrerEntrainement } from "@/lib/db/entrainement";
import { enregistrerRevision } from "@/lib/db/revision";
import { listerLesSignalements, signalerUneQuestion } from "@/lib/db/signalement";
import { estAdministrateur } from "@/lib/auth/admin";
import { VERSIONS_DES_PROMPTS_FR } from "@/lib/ai/prompts";
import { fabriquerConcept } from "./abus-fabrique";
import { noter } from "./journal";

/**
 * La progression comptée et la trace d'un signalement, deux garanties qui se
 * cassent en silence. L'entraînement ne doit rien compter ; un signalement
 * doit survivre au concept, puisque supprimer le concept est le geste qui suit
 * une question fausse.
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
  noter(
    "Progression — un passage de session vaut un point, quelle que soit la note",
    apresUn?.xp === 1 && apresUn?.currentStreak === 1 && apresUn?.level === 1,
    `${apresUn?.xp} XP, série ${apresUn?.currentStreak}, niveau ${apresUn?.level}`,
  );

  // Raté puis retrouvé : le seul cas où le résultat compte, pour récompenser
  // d'être revenu.
  const second = await fabriquerConcept(userId, { libelle: "Un concept qu'on rate puis retrouve" });
  await reviser(userId, second, "AGAIN", maintenant, 0);
  const avantRattrapage = await statsDe(userId);
  await reviser(userId, second, "GOOD", new Date(maintenant.getTime() + JOUR_MS), 1);
  const apresRattrapage = await statsDe(userId);

  noter(
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

  noter(
    "Progression — l'entraînement ne donne ni point, ni série",
    apresEntrainement?.xp === avantEntrainement?.xp &&
      apresEntrainement?.currentStreak === avantEntrainement?.currentStreak &&
      apresEntrainement?.lastReviewedOn?.getTime() === avantEntrainement?.lastReviewedOn?.getTime(),
    `${apresEntrainement?.xp} XP et série ${apresEntrainement?.currentStreak}, inchangées`,
  );

  // La garantie la plus solide : l'entraînement n'importe pas la progression.
  const entrainement = readFileSync("lib/db/entrainement.ts", "utf8");
  noter(
    "Progression — le chemin de l'entraînement ne connaît pas le compteur",
    !entrainement.includes("progression"),
    entrainement.includes("progression") ? "il l'importe" : "aucun import",
  );
}

/**
 * La série se compte en jours civils de l'utilisateur : vingt minutes autour
 * de minuit à Paris font deux jours pour lui, un seul en UTC.
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

  noter(
    "Série — vingt minutes à cheval sur minuit local comptent deux jours",
    veille?.currentStreak === 1 && lendemain?.currentStreak === 2,
    `${veille?.currentStreak} puis ${lendemain?.currentStreak}`,
  );

  await reviser(userId, concept, "GOOD", new Date("2026-03-11T09:00:00Z"), 2);
  const memeJour = await statsDe(userId);

  noter(
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
    data: { promptVersion: VERSIONS_DES_PROMPTS_FR.generate_variants, model: "claude-sonnet-5" },
  });

  const ecrit = await signalerUneQuestion(
    { userId, variantId, motif: "FAUSSE", commentaire: "Ce n'est pas ce que dit ma source." },
    new Date(),
  );
  const retiree = await prisma.variant.findUniqueOrThrow({ where: { id: variantId } });

  noter(
    "Signalement — la question signalée sort du tirage, sans rien régénérer",
    ecrit && retiree.retiredAt !== null,
    ecrit ? "retirée, aucune demande de questions" : "refusé",
  );

  const avant = (await listerLesSignalements()).find((ligne) => ligne.atomId === concept.atomId);

  noter(
    "Signalement — la version des prompts est capturée",
    avant?.promptVersion === VERSIONS_DES_PROMPTS_FR.generate_variants &&
      avant?.model === "claude-sonnet-5",
    `prompt ${avant?.promptVersion ?? "absent"}, modèle ${avant?.model ?? "absent"}`,
  );

  // Le geste qui suit une question fausse.
  await prisma.atom.delete({ where: { id: concept.atomId } });
  const apres = (await listerLesSignalements()).find((ligne) => ligne.id === avant?.id);

  noter(
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

  noter(
    "Administration — seule une adresse autorisée ouvre les signalements",
    rates.length === 0 && fermeParDefaut,
    rates.length === 0
      ? "liste vide comprise : elle n'autorise personne"
      : `échecs : ${rates.join(", ")}`,
  );

  // La garde doit être sur chaque page du dossier, pas dans le lien qui y mène
  // (une URL se tape à la main). Une page qui l'oublie ne casse aucun rendu et
  // s'ouvre à tout le monde.
  const internes = pagesDuDossier("app/(app)/admin").filter(
    (chemin) => !readFileSync(chemin, "utf8").includes("exigerUnAdministrateur"),
  );

  // L'ancienne adresse renvoie au lieu d'afficher, hors de l'aide commune, mais
  // se garde aussi : un renvoi non gardé révélerait l'adresse de l'écran.
  const ancienne = readFileSync("app/(app)/signalements/page.tsx", "utf8");
  const ancienneNue = !(ancienne.includes("estAdministrateur") && ancienne.includes("notFound"));

  noter(
    "Administration — chacune de ses pages se garde, et n'admet pas son existence",
    internes.length === 0 && !ancienneNue,
    internes.length === 0 && !ancienneNue
      ? `${pagesDuDossier("app/(app)/admin").length} page(s) gardées, ancienne adresse comprise`
      : [...internes, ancienneNue ? "app/(app)/signalements/page.tsx" : ""]
          .filter(Boolean)
          .join(", "),
  );
}

/** Tous les `page.tsx` sous un dossier de routes. */
function pagesDuDossier(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);

    if (entree.isDirectory()) return pagesDuDossier(chemin);

    return entree.name === "page.tsx" ? [chemin] : [];
  });
}
