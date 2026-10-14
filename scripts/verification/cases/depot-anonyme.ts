import { prisma } from "@/lib/db/client";
import { lireUsageDeLaPeriode } from "@/lib/db/periode-du-compte";
import { compterLaVisiteReprise } from "@/lib/db/comptage-de-la-periode";
import {
  JOURS_AVANT_OUBLI,
  lireLeDepotAnonyme,
  oublierLesVisitesAbandonnees,
  rattacherAuCompte,
} from "@/lib/db/depot-de-visite";
import { marquerEchec } from "@/lib/db/fin-de-depot";
import {
  compterLesDepots,
  ESSAIS_PAR_VISITE,
  FENETRE_ESSAIS_HEURES,
  PANNES_TOLEREES,
  sessionDisponible,
} from "@/lib/db/essais-de-la-visite";
import { VISITES_PAR_ADRESSE } from "@/lib/db/session-anonyme";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { executerToutLePipeline } from "./depot-simule";
import { noter } from "./journal";

/**
 * Le dépôt avant compte, seul endroit du produit qui dépense sans compte
 * identifié. Trois choses doivent tenir : deux essais par visite et par tranche
 * de vingt-quatre heures, une poignée de visites par adresse, et un seul
 * concept questionné — sinon un visiteur coûterait cinq fois plus.
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

  noter(
    "Essai — le visiteur voit vraiment ses concepts, sans compte",
    (vu?.concepts.length ?? 0) > 0,
    `${vu?.concepts.length ?? 0} concept(s) affichés`,
  );

  // Le point qui rend l'ouverture finançable : la landing montre un échantillon,
  // donc un seul concept reçoit ses quatre questions — un appel de plus par
  // visiteur, pas cinq.
  const questions = await prisma.variant.count({
    where: { atom: { anonymousSessionId: essai.sessionId } },
  });
  const questionnes = await prisma.atom.count({
    where: { anonymousSessionId: essai.sessionId, variants: { some: {} } },
  });

  noter(
    "Essai — un seul concept reçoit ses quatre questions, les autres attendent le compte",
    questionnes === 1 && questions === 4,
    `${questions} question(s) sur ${questionnes} concept(s) questionné(s)`,
  );

  const second = await deposerSansCompte(TEXTE, adresse, essai.sessionId);
  const troisieme = second.ok
    ? await deposerSansCompte(TEXTE, adresse, essai.sessionId)
    : { ok: false as const, motif: "le second avait déjà été refusé" };

  noter(
    "Essai — un découpage réussi laisse un second essai, mais pas un troisième",
    second.ok && !troisieme.ok,
    second.ok
      ? `second accordé, troisième ${troisieme.ok ? "accordé aussi" : `refusé : « ${troisieme.motif} »`}`
      : second.motif,
  );

  // Les dépôts de contrôle repartent : la suite du cas éprouve la reprise au
  // compte, et deux extractions jamais exécutées n'ont rien à y faire.
  await prisma.input.deleteMany({
    where: { anonymousSessionId: essai.sessionId, id: { not: essai.inputId } },
  });

  const repris = await rattacherAuCompte(essai.sessionId, userId);
  const conceptsRepris = repris.reduce((total, depot) => total + depot.atomIds.length, 0);
  const aMoi = await prisma.atom.count({ where: { userId } });
  const orphelins = await prisma.atom.count({
    where: { anonymousSessionId: essai.sessionId },
  });

  noter(
    "Reprise — dépôt et concepts passent au compte, sans reste",
    conceptsRepris > 0 && aMoi === conceptsRepris && orphelins === 0,
    `${aMoi} concept(s) au compte, ${orphelins} resté(s) sur la visite`,
  );

  // Chaque concept repris doit rester sous le dépôt qui l'a produit : c'est ce
  // qui décide sous quel dépôt les questions seront demandées.
  const malRanges = await prisma.atom.count({
    where: { userId, NOT: { inputId: { in: repris.map((depot) => depot.inputId) } } },
  });

  noter(
    "Reprise — les concepts restent groupés sous leur dépôt d'origine",
    malRanges === 0 && repris.every((depot) => depot.inputId.length > 0),
    `${repris.length} dépôt(s) repris, ${malRanges} concept(s) hors de leur dépôt`,
  );

  // Ce que l'essai a rendu entre au compteur du mois, sinon un compte neuf
  // aurait ses concepts d'essai en plus de son plafond.
  const avant = await lireUsageDeLaPeriode(userId, "UTC");
  await compterLaVisiteReprise(userId, "UTC", conceptsRepris);
  const apres = await lireUsageDeLaPeriode(userId, "UTC");

  noter(
    "Reprise — les concepts de l'essai entrent au plafond du mois",
    apres.concepts === avant.concepts + conceptsRepris && apres.concepts > 0,
    `${avant.concepts} → ${apres.concepts} concept(s) comptés pour ${conceptsRepris} repris`,
  );

  noter(
    "Reprise — l'extraction de l'essai compte aussi comme un dépôt",
    apres.depots === avant.depots + 1,
    `${avant.depots} → ${apres.depots} dépôt(s)`,
  );

  const reprise = await rattacherAuCompte(essai.sessionId, userId);

  noter(
    "Reprise — la même visite ne se réclame pas deux fois",
    reprise.length === 0,
    `${reprise.length} dépôt(s) repris au second appel`,
  );

  await prisma.input.deleteMany({ where: { userId } });
  await repartirDeZero(adresse);
}

/**
 * L'essai qui ne donne rien laisse une seconde chance, et une seule : sinon
 * qui colle le mauvais texte du premier coup tombe sur une page morte.
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

  noter(
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

  noter(
    "Essai — la seconde chance ne se répète pas",
    !troisieme.ok,
    troisieme.ok ? "un troisième essai est passé" : troisieme.motif,
  );

  await repartirDeZero(adresse);
}

/**
 * Une panne ne se facture pas au visiteur : sinon le produit se casse puis
 * ferme la porte derrière lui, sur la page qui convertit.
 */
export async function casPanneNeConsommePasDEssai(): Promise<void> {
  const adresse = "203.0.113.71";
  await repartirDeZero(adresse);

  const essai = await deposerSansCompte(TEXTE, adresse, null);

  if (!essai.ok) throw new Error(`L'essai a été refusé : ${essai.motif}`);

  // `marquerEchec` et non une écriture directe : c'est le chemin que prend un
  // appel qui lève, et c'est lui qu'on veut voir se comporter.
  await marquerEchec(essai.inputId, "Panne simulée par la vérification.");

  const apresPanne = await compterLesDepots(essai.sessionId);
  const ouverte = await sessionDisponible(essai.sessionId);

  noter(
    "Panne — un dépôt en panne ne consomme aucun essai",
    ouverte && apresPanne.imputables === 0 && apresPanne.pannes === 1,
    `${apresPanne.imputables} imputable(s), ${apresPanne.pannes} panne(s), visite ${
      ouverte ? "ouverte" : "fermée"
    }`,
  );

  // Les essais dus restent entièrement dus : un plafond total ne le tiendrait
  // pas, la panne mordant sur la même réserve.
  let accordes = 0;

  for (let tour = 0; tour < ESSAIS_PAR_VISITE + 1; tour += 1) {
    const suite = await deposerSansCompte(TEXTE, adresse, essai.sessionId);

    if (!suite.ok) break;

    accordes += 1;
  }

  noter(
    `Panne — après une panne, les ${ESSAIS_PAR_VISITE} essais dus restent dus`,
    accordes === ESSAIS_PAR_VISITE,
    `${accordes} essai(s) accordé(s) après la panne`,
  );

  await repartirDeZero(adresse);
}

/**
 * Les pannes tolérées ont une fin, sinon une panne systématique rendrait la
 * visite infinie. On vérifie aussi ce que dit le refus : il désigne la panne.
 */
export async function casPlafondDesPannes(): Promise<void> {
  const adresse = "203.0.113.72";
  await repartirDeZero(adresse);

  const premier = await deposerSansCompte(TEXTE, adresse, null);

  if (!premier.ok) throw new Error(`L'essai a été refusé : ${premier.motif}`);

  await marquerEchec(premier.inputId, "Panne simulée par la vérification.");

  for (let tour = 1; tour < PANNES_TOLEREES; tour += 1) {
    const suivant = await deposerSansCompte(TEXTE, adresse, premier.sessionId);

    if (!suivant.ok) throw new Error(`La panne ${tour + 1} a été refusée : ${suivant.motif}`);

    await marquerEchec(suivant.inputId, "Panne simulée par la vérification.");
  }

  const refuse = await deposerSansCompte(TEXTE, adresse, premier.sessionId);
  const compte = await compterLesDepots(premier.sessionId);

  noter(
    `Panne — ${PANNES_TOLEREES} pannes ferment la visite`,
    !refuse.ok && compte.pannes === PANNES_TOLEREES,
    refuse.ok
      ? "une panne de plus est passée"
      : `${compte.pannes} panne(s), puis « ${refuse.motif} »`,
  );

  // Ni « tes concepts » — il n'en a aucun —, ni « tes essais sont faits » — ils
  // sont intacts, c'est toute la règle. Le refus doit désigner la panne.
  noter(
    "Panne — le refus désigne la panne, pas des concepts ni des essais consommés",
    !refuse.ok && !refuse.motif.includes("tes concepts") && !refuse.motif.includes("Tes essais"),
    refuse.ok ? "accepté" : refuse.motif,
  );

  await repartirDeZero(adresse);
}

/**
 * Après un rejet puis un succès sur la même visite, c'est le dépôt récent
 * qu'on lit : la session est la même d'un essai à l'autre, seul l'identifiant
 * du dépôt distingue le second.
 */
export async function casRepriseApresRejet(): Promise<void> {
  const adresse = "203.0.113.73";
  await repartirDeZero(adresse);

  const rate = await deposerSansCompte(
    "Lentilles corail, tomates pelées, pain de seigle, deux citrons et du persil plat.",
    adresse,
    null,
  );

  if (!rate.ok) throw new Error(`Le premier essai a été refusé : ${rate.motif}`);

  await executerToutLePipeline(rate.inputId);

  const retente = await deposerSansCompte(TEXTE, adresse, rate.sessionId);

  if (!retente.ok) throw new Error(`La reprise a été refusée : ${retente.motif}`);

  await executerToutLePipeline(retente.inputId);

  const vu = await lireLeDepotAnonyme(rate.sessionId);

  noter(
    "Reprise — c'est le second essai qui s'affiche, pas le premier",
    vu?.inputId === retente.inputId && (vu?.concepts.length ?? 0) > 0,
    `dépôt lu : ${vu?.inputId === retente.inputId ? "le second" : "le premier"}, ${
      vu?.concepts.length ?? 0
    } concept(s)`,
  );

  await repartirDeZero(adresse);
}

/**
 * Deux onglets partent ensemble avec le même cookie, et les deux passent :
 * acceptable, la visite reste dans son budget, mais constaté ici.
 */
export async function casDeuxOngletsSimultanes(): Promise<void> {
  const adresse = "203.0.113.74";
  await repartirDeZero(adresse);

  const premier = await deposerSansCompte(TEXTE, adresse, null);

  if (!premier.ok) throw new Error(`L'essai a été refusé : ${premier.motif}`);

  // Aucun pipeline entre les deux : c'est exactement la fenêtre du second onglet.
  const second = await deposerSansCompte(TEXTE, adresse, premier.sessionId);
  const compte = await compterLesDepots(premier.sessionId);
  const troisieme = await deposerSansCompte(TEXTE, adresse, premier.sessionId);

  noter(
    "Visite — deux onglets consomment les deux essais d'un coup, et pas plus",
    second.ok && compte.imputables === ESSAIS_PAR_VISITE && !troisieme.ok,
    `${compte.imputables} imputable(s) après deux envois simultanés, troisième ${
      troisieme.ok ? "accepté" : "refusé"
    }`,
  );

  await repartirDeZero(adresse);
}

/**
 * Deux essais épuisés ferment la porte, et le lendemain c'est la même visite
 * qui se rouvre. La reprise au compte passe par l'identifiant du cookie : une
 * visite neuve laisserait la précédente au cron d'oubli, avec ses concepts.
 */
export async function casReouvertureLeLendemain(userId: string): Promise<void> {
  const adresse = "203.0.113.88";
  await repartirDeZero(adresse);
  await prisma.input.deleteMany({ where: { userId } });

  const premier = await deposerSansCompte(TEXTE, adresse, null);

  if (!premier.ok) throw new Error(`L'essai a été refusé : ${premier.motif}`);

  await executerToutLePipeline(premier.inputId);

  const second = await deposerSansCompte(TEXTE, adresse, premier.sessionId);

  if (!second.ok) throw new Error(`Le second essai a été refusé : ${second.motif}`);

  await executerToutLePipeline(second.inputId);

  const ferme = await deposerSansCompte(TEXTE, adresse, premier.sessionId);

  noter(
    "Visite — deux essais faits, la porte est fermée",
    !ferme.ok,
    ferme.ok ? "un troisième essai est passé" : ferme.motif,
  );

  // On vieillit les deux dépôts au-delà de la fenêtre : c'est le lendemain, vu
  // par la seule chose qui le décide.
  const veille = new Date(Date.now() - (FENETRE_ESSAIS_HEURES + 1) * 60 * 60 * 1000);

  await prisma.input.updateMany({
    where: { anonymousSessionId: premier.sessionId },
    data: { createdAt: veille },
  });

  const lendemain = await deposerSansCompte(TEXTE, adresse, premier.sessionId);

  noter(
    `Visite — après ${FENETRE_ESSAIS_HEURES} h, la même visite redonne ses essais`,
    lendemain.ok && lendemain.sessionId === premier.sessionId,
    lendemain.ok
      ? lendemain.sessionId === premier.sessionId
        ? "même visite, essais rendus"
        : "une visite neuve a été ouverte : les concepts d'hier seraient perdus"
      : lendemain.motif,
  );

  if (lendemain.ok) await executerToutLePipeline(lendemain.inputId);

  const depots = await prisma.input.count({ where: { anonymousSessionId: premier.sessionId } });
  const repris = await rattacherAuCompte(premier.sessionId, userId);

  noter(
    "Reprise — tout ce que la visite a déposé part au compte, d'hier comme d'aujourd'hui",
    repris.length === depots && depots >= 3,
    `${repris.length} dépôt(s) repris sur ${depots} déposé(s)`,
  );

  await prisma.input.deleteMany({ where: { userId } });
  await repartirDeZero(adresse);
}

export async function casLimiteParAdresse(): Promise<void> {
  const adresse = "203.0.113.42";
  await repartirDeZero(adresse);

  let acceptes = 0;
  let refus = "aucun";

  // Chaque essai part sans cookie : c'est le cas de quelqu'un qui vide sa
  // session entre deux tentatives, et c'est exactement ce que l'adresse borne.
  for (let tour = 0; tour < VISITES_PAR_ADRESSE + 2; tour += 1) {
    const essai = await deposerSansCompte(TEXTE, adresse, null);

    if (essai.ok) {
      acceptes += 1;
      continue;
    }

    refus = essai.motif;
    break;
  }

  noter(
    `Essai — la même adresse n'ouvre que ${VISITES_PAR_ADRESSE} visites`,
    acceptes === VISITES_PAR_ADRESSE,
    `${acceptes} visite(s) ouvertes, puis « ${refus} »`,
  );

  // Une autre adresse n'est pas concernée : la limite borne une provenance, pas
  // le produit.
  const ailleurs = await deposerSansCompte(TEXTE, "198.51.100.3", null);

  noter(
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

  noter(
    "Oubli — une visite non réclamée disparaît avec son dépôt, une réclamée reste",
    restantes.length === 1 && restantes[0]?.id === gardee.sessionId && depotsRestants === 0,
    `${restantes.length} visite(s) restante(s), ${depotsRestants} dépôt(s) orphelin(s)`,
  );

  await repartirDeZero(adresse);
}
