import { prisma } from "@/lib/db/client";
import { compterLaVisiteReprise, lireUsageDeLaPeriode } from "@/lib/db/quota-depots";
import {
  JOURS_AVANT_OUBLI,
  lireLeDepotAnonyme,
  oublierLesVisitesAbandonnees,
  rattacherAuCompte,
} from "@/lib/db/depot-de-visite";
import { DEPOTS_PAR_ADRESSE } from "@/lib/db/session-anonyme";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { executerToutLePipeline } from "./depot-simule";
import { record } from "./journal";

/**
 * Le dépôt avant compte, éprouvé là où il coûte de l'argent.
 *
 * C'est le seul endroit du produit qui dépense sans compte identifié, donc le
 * seul où une faille se paie directement. Trois choses doivent tenir : un dépôt
 * par visite, une poignée par adresse, et **l'arrêt à l'extraction** — si les
 * questions partaient, un visiteur coûterait dix fois plus et l'ouverture ne
 * serait plus finançable.
 */

const TEXTE = `Une requête HTTP conditionnelle envoie \`If-None-Match\` avec l'étiquette reçue à la
réponse précédente. Le serveur compare, et répond 304 sans corps quand la ressource n'a pas changé.
Le navigateur sert alors sa copie, ce qui économise la bande passante mais pas l'aller-retour.`;

/** Les visites d'une adresse de test, effacées entre deux cas. */
async function repartirDeZero(adresse: string): Promise<void> {
  const { empreinteDeLAdresse } = await import("@/lib/db/session-anonyme");

  await prisma.anonymousSession.deleteMany({ where: { ipHash: empreinteDeLAdresse(adresse) } });
}

export async function casEssaiPuisCompte(userId: string): Promise<void> {
  const adresse = "203.0.113.7";
  await repartirDeZero(adresse);
  await prisma.input.deleteMany({ where: { userId } });

  const essai = await deposerSansCompte(TEXTE, adresse, null);

  if (!essai.ok) throw new Error(`L'essai a été refusé : ${essai.motif}`);

  await executerToutLePipeline(essai.inputId);

  const vu = await lireLeDepotAnonyme(essai.sessionId);

  record(
    "Essai — le visiteur voit vraiment ses concepts, sans compte",
    (vu?.concepts.length ?? 0) > 0,
    `${vu?.concepts.length ?? 0} concept(s) affichés`,
  );

  // Le point qui rend l'ouverture finançable : la chaîne s'arrête là.
  const questions = await prisma.variant.count({
    where: { atom: { anonymousSessionId: essai.sessionId } },
  });
  const jobs = await prisma.generationJob.count({
    where: { inputId: essai.inputId, kind: "VARIANTS" },
  });

  record(
    "Essai — aucune question n'est écrite tant que personne n'a créé de compte",
    questions === 0 && jobs === 0,
    `${questions} question(s), ${jobs} demande(s) — la dépense s'arrête à l'extraction`,
  );

  const second = await deposerSansCompte(TEXTE, adresse, essai.sessionId);

  record(
    "Essai — un essai qui a donné des concepts ferme la visite",
    !second.ok,
    second.ok ? "acceptée" : second.motif,
  );

  const repris = await rattacherAuCompte(essai.sessionId, userId);
  const aMoi = await prisma.atom.count({ where: { userId } });
  const orphelins = await prisma.atom.count({
    where: { anonymousSessionId: essai.sessionId },
  });

  record(
    "Reprise — dépôt et concepts passent au compte, sans reste",
    repris.atomIds.length > 0 && aMoi === repris.atomIds.length && orphelins === 0,
    `${aMoi} concept(s) au compte, ${orphelins} resté(s) sur la visite`,
  );

  // Ce que l'essai a rendu doit entrer au compteur du mois. Sans ça, la limite
  // annoncée cesse d'être la limite réelle : un compte neuf démarrait avec ses
  // concepts d'essai en plus de ses trente.
  const avant = await lireUsageDeLaPeriode(userId, "UTC");
  await compterLaVisiteReprise(userId, "UTC", repris.atomIds.length);
  const apres = await lireUsageDeLaPeriode(userId, "UTC");

  record(
    "Reprise — les concepts de l'essai entrent au plafond du mois",
    apres.concepts === avant.concepts + repris.atomIds.length && apres.concepts > 0,
    `${avant.concepts} → ${apres.concepts} concept(s) comptés pour ${repris.atomIds.length} repris`,
  );

  record(
    "Reprise — l'extraction de l'essai compte aussi comme un dépôt",
    apres.depots === avant.depots + 1,
    `${avant.depots} → ${apres.depots} dépôt(s)`,
  );

  const reprise = await rattacherAuCompte(essai.sessionId, userId);

  record(
    "Reprise — la même visite ne se réclame pas deux fois",
    reprise.atomIds.length === 0,
    `${reprise.atomIds.length} concept(s) repris au second appel`,
  );

  await prisma.input.deleteMany({ where: { userId } });
  await repartirDeZero(adresse);
}

/**
 * L'essai qui ne donne rien laisse une seconde chance, et une seule.
 *
 * Sans elle, quelqu'un qui colle le mauvais texte du premier coup se retrouve
 * devant une page morte : sa visite est consommée, il n'a rien vu du produit, et
 * la seule page qui convertit devient une impasse.
 */
export async function casSecondeChance(): Promise<void> {
  const adresse = "203.0.113.55";
  await repartirDeZero(adresse);

  // Une liste de courses : la chaîne tourne et conclut qu'il n'y a rien.
  const rate = await deposerSansCompte(
    "Lentilles corail, tomates pelées, pain de seigle, deux citrons et du persil plat.",
    adresse,
    null,
  );

  if (!rate.ok) throw new Error(`Le premier essai a été refusé : ${rate.motif}`);

  await executerToutLePipeline(rate.inputId);

  const concepts = await prisma.atom.count({ where: { anonymousSessionId: rate.sessionId } });
  const retente = await deposerSansCompte(TEXTE, adresse, rate.sessionId);

  record(
    "Essai — un essai qui n'a rien donné laisse retenter",
    concepts === 0 && retente.ok,
    concepts === 0
      ? retente.ok
        ? "seconde chance accordée"
        : retente.motif
      : `${concepts} concept(s)`,
  );

  if (retente.ok) await executerToutLePipeline(retente.inputId);

  const troisieme = await deposerSansCompte(TEXTE, adresse, rate.sessionId);

  record(
    "Essai — la seconde chance ne se répète pas",
    !troisieme.ok,
    troisieme.ok ? "un troisième essai est passé" : troisieme.motif,
  );

  await repartirDeZero(adresse);
}

export async function casLimiteParAdresse(): Promise<void> {
  const adresse = "203.0.113.42";
  await repartirDeZero(adresse);

  let acceptes = 0;
  let refus = "aucun";

  // Chaque essai part sans cookie : c'est le cas de quelqu'un qui vide sa
  // session entre deux tentatives, et c'est exactement ce que l'adresse borne.
  for (let tour = 0; tour < DEPOTS_PAR_ADRESSE + 2; tour += 1) {
    const essai = await deposerSansCompte(TEXTE, adresse, null);

    if (essai.ok) {
      acceptes += 1;
      continue;
    }

    refus = essai.motif;
    break;
  }

  record(
    `Essai — la même adresse n'ouvre que ${DEPOTS_PAR_ADRESSE} visites`,
    acceptes === DEPOTS_PAR_ADRESSE,
    `${acceptes} visite(s) ouvertes, puis « ${refus} »`,
  );

  // Une autre adresse n'est pas concernée : la limite borne une provenance, pas
  // le produit.
  const ailleurs = await deposerSansCompte(TEXTE, "198.51.100.3", null);

  record(
    "Essai — une autre adresse reste servie",
    ailleurs.ok,
    ailleurs.ok ? "servie" : ailleurs.motif,
  );

  await repartirDeZero(adresse);
  await repartirDeZero("198.51.100.3");
}

export async function casOubliDesVisites(): Promise<void> {
  const adresse = "203.0.113.99";
  await repartirDeZero(adresse);

  const abandonnee = await deposerSansCompte(TEXTE, adresse, null);
  const gardee = await deposerSansCompte(TEXTE, adresse, null);

  if (!abandonnee.ok || !gardee.ok) throw new Error("Les deux essais auraient dû passer.");

  // L'une est réclamée, l'autre vieillit sans que personne ne la réclame.
  await prisma.anonymousSession.update({
    where: { id: gardee.sessionId },
    data: { claimedAt: new Date() },
  });
  await prisma.anonymousSession.updateMany({
    where: { id: { in: [abandonnee.sessionId, gardee.sessionId] } },
    data: { createdAt: new Date(Date.now() - (JOURS_AVANT_OUBLI + 1) * 24 * 60 * 60 * 1000) },
  });

  await oublierLesVisitesAbandonnees();

  const restantes = await prisma.anonymousSession.findMany({
    where: { id: { in: [abandonnee.sessionId, gardee.sessionId] } },
    select: { id: true },
  });
  const depotsRestants = await prisma.input.count({
    where: { anonymousSessionId: abandonnee.sessionId },
  });

  record(
    "Oubli — une visite non réclamée disparaît avec son dépôt, une réclamée reste",
    restantes.length === 1 && restantes[0]?.id === gardee.sessionId && depotsRestants === 0,
    `${restantes.length} visite(s) restante(s), ${depotsRestants} dépôt(s) orphelin(s)`,
  );

  await repartirDeZero(adresse);
}
