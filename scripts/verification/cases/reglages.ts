import { lireLaConfigDeLEnvironnement } from "@/lib/ai/config";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { prisma } from "@/lib/db/client";
import { lireLeJournal, lireLesReglagesPosés, poserLesReglages } from "@/lib/db/reglages";
import { noter } from "./journal";

/**
 * Les réglages posés en base. Chaque cas repose l'état d'origine en sortant :
 * un réglage oublié pourrait être un `mock` à `false` sur un poste de
 * développement, donc des appels payés sans demande.
 */

const AUCUN = {
  enabled: null,
  mock: null,
  dailyCallCap: null,
  userDailyCallCap: null,
  anonymousDailyCallCap: null,
  model: null,
  maxTokens: null,
};

const OPERATEUR = "verification@cairn.test";

/** La surcharge l'emporte sur l'environnement, et son retrait rend la main. */
export async function casSurchargeEtRetour(): Promise<void> {
  const environnement = lireLaConfigDeLEnvironnement();
  const augmente = environnement.maxTokens + 1234;

  await poserLesReglages({ ...AUCUN, maxTokens: augmente }, OPERATEUR);
  const avecSurcharge = await lireLaConfigEffective();

  noter(
    "Réglages — une valeur posée l'emporte sur l'environnement",
    avecSurcharge.maxTokens === augmente,
    `${environnement.maxTokens} → ${avecSurcharge.maxTokens}`,
  );

  noter(
    "Réglages — ce qui n'est pas posé continue de suivre l'environnement",
    avecSurcharge.model === environnement.model &&
      avecSurcharge.dailyCallCap === environnement.dailyCallCap,
    `modèle ${avecSurcharge.model}, plafond ${avecSurcharge.dailyCallCap}`,
  );

  await poserLesReglages(AUCUN, OPERATEUR);
  const rendu = await lireLaConfigEffective();

  noter(
    "Réglages — retirer la surcharge rend la main au défaut",
    rendu.maxTokens === environnement.maxTokens,
    `${rendu.maxTokens}`,
  );
}

/**
 * Une valeur absurde est refusée avant d'atteindre le moteur. Le plafond à zéro
 * passerait le typage et couperait toute l'ingestion en « quota atteint ».
 */
export async function casValeurAbsurdeRefusee(): Promise<void> {
  await poserLesReglages({ ...AUCUN, dailyCallCap: 0 }, OPERATEUR);

  let leve = false;

  try {
    await lireLaConfigEffective();
  } catch {
    leve = true;
  }

  noter(
    "Réglages — un plafond à zéro lève au lieu de couper l'ingestion en silence",
    leve,
    leve ? "refusé" : "accepté, ce qui est un trou",
  );

  await poserLesReglages(AUCUN, OPERATEUR);
}

/**
 * Une valeur posée rattrape une variable d'environnement absente : c'est la
 * raison d'être de l'écran, corriger sans redéploiement. Les deux moitiés sont
 * vérifiées : sans surcharge, l'absence reste une erreur, sinon la
 * configuration accepterait n'importe quoi.
 */
export async function casSurchargeRattrapeLEnvironnement(): Promise<void> {
  const origine = process.env.AI_DAILY_CALL_CAP_ANONYME;
  delete process.env.AI_DAILY_CALL_CAP_ANONYME;

  try {
    let leve = false;

    try {
      lireLaConfigDeLEnvironnement();
    } catch {
      leve = true;
    }

    noter(
      "Réglages — une variable absente reste une erreur tant que rien ne la remplace",
      leve,
      leve ? "refusé" : "accepté, ce qui est un trou",
    );

    await poserLesReglages({ ...AUCUN, anonymousDailyCallCap: 7 }, OPERATEUR);
    const effective = await lireLaConfigEffective();

    noter(
      "Réglages — une valeur posée rattrape une variable d'environnement absente",
      effective.anonymousDailyCallCap === 7,
      `plafond anonyme ${effective.anonymousDailyCallCap}`,
    );
  } finally {
    await poserLesReglages(AUCUN, OPERATEUR);

    if (origine === undefined) delete process.env.AI_DAILY_CALL_CAP_ANONYME;
    else process.env.AI_DAILY_CALL_CAP_ANONYME = origine;
  }
}

/** Rien ne change sans trace, et rien n'est tracé sans changement. */
export async function casJournalTrace(): Promise<void> {
  const avant = await lireLeJournal(50);

  await poserLesReglages({ ...AUCUN, enabled: false }, OPERATEUR);
  const apresChangement = await lireLeJournal(50);

  const nouvelle = apresChangement.find(
    (ligne) => ligne.reglage === "enabled" && !avant.some((vieille) => vieille.id === ligne.id),
  );

  noter(
    "Réglages — un changement écrit son avant, son après et son auteur",
    nouvelle?.apres === "false" && nouvelle.parEmail === OPERATEUR,
    nouvelle
      ? `${nouvelle.avant ?? "—"} → ${nouvelle.apres ?? "—"} par ${nouvelle.parEmail}`
      : "aucune ligne",
  );

  const { changements } = await poserLesReglages({ ...AUCUN, enabled: false }, OPERATEUR);

  noter(
    "Réglages — réenregistrer sans rien changer n'encombre pas le journal",
    changements === 0,
    `${changements} changement(s)`,
  );

  await poserLesReglages(AUCUN, OPERATEUR);
}

/**
 * Aucune surcharge ne survit à la vérification. Le piège sur `fetch` attraperait
 * un mode mock coupé ; ce cas le dit plus tôt et plus clairement.
 */
export async function casAucunResteEnBase(): Promise<void> {
  await prisma.reglageJournal.deleteMany({ where: { parEmail: OPERATEUR } });
  const restants = await lireLesReglagesPosés();
  const poses = Object.values(restants).filter((valeur) => valeur !== null);

  noter(
    "Réglages — la vérification ne laisse aucune surcharge derrière elle",
    poses.length === 0,
    poses.length === 0 ? "table rendue vide" : `${poses.length} surcharge(s) restante(s)`,
  );
}
