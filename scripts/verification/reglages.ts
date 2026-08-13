import { readAiConfig } from "@/lib/ai/config";
import { lireLaConfigEffective } from "@/lib/ai/reglages-effectifs";
import { prisma } from "@/lib/db/client";
import { lireLeJournal, lireLesReglagesPosés, poserLesReglages } from "@/lib/db/reglages";
import { record } from "./journal";

/**
 * Les réglages posés en base, éprouvés là où ils comptent.
 *
 * Ce que ces cas gardent : qu'une valeur posée l'emporte vraiment sur
 * l'environnement, qu'on puisse revenir au défaut, qu'une valeur absurde soit
 * refusée avant d'atteindre le moteur, et que rien ne change sans laisser de
 * trace.
 *
 * Ils reposent l'état d'origine en sortant. Un réglage oublié en base après une
 * vérification ne serait pas un test qui salit : ce serait un `mock` à `false`
 * sur un poste de développement, donc de l'argent dépensé sans qu'on l'ait
 * demandé.
 */

const AUCUN = {
  enabled: null,
  mock: null,
  dailyCallCap: null,
  userDailyCallCap: null,
  model: null,
  maxTokens: null,
};

const OPERATEUR = "verification@cairn.test";

/** La surcharge l'emporte sur l'environnement, et son retrait rend la main. */
export async function casSurchargeEtRetour(): Promise<void> {
  const environnement = readAiConfig();
  const augmente = environnement.maxTokens + 1234;

  await poserLesReglages({ ...AUCUN, maxTokens: augmente }, OPERATEUR);
  const avecSurcharge = await lireLaConfigEffective();

  record(
    "Réglages — une valeur posée l'emporte sur l'environnement",
    avecSurcharge.maxTokens === augmente,
    `${environnement.maxTokens} → ${avecSurcharge.maxTokens}`,
  );

  record(
    "Réglages — ce qui n'est pas posé continue de suivre l'environnement",
    avecSurcharge.model === environnement.model &&
      avecSurcharge.dailyCallCap === environnement.dailyCallCap,
    `modèle ${avecSurcharge.model}, plafond ${avecSurcharge.dailyCallCap}`,
  );

  await poserLesReglages(AUCUN, OPERATEUR);
  const rendu = await lireLaConfigEffective();

  record(
    "Réglages — retirer la surcharge rend la main au défaut",
    rendu.maxTokens === environnement.maxTokens,
    `${rendu.maxTokens}`,
  );
}

/**
 * Une valeur absurde est refusée avant d'atteindre le moteur.
 *
 * Le plafond à zéro est le cas qui compte : il passerait le typage, se poserait
 * sans bruit, et couperait toute l'ingestion en rendant « quota atteint » sur le
 * premier appel de la journée.
 */
export async function casValeurAbsurdeRefusee(): Promise<void> {
  await poserLesReglages({ ...AUCUN, dailyCallCap: 0 }, OPERATEUR);

  let leve = false;

  try {
    await lireLaConfigEffective();
  } catch {
    leve = true;
  }

  record(
    "Réglages — un plafond à zéro lève au lieu de couper l'ingestion en silence",
    leve,
    leve ? "refusé" : "accepté, ce qui est un trou",
  );

  await poserLesReglages(AUCUN, OPERATEUR);
}

/** Rien ne change sans trace, et rien n'est tracé sans changement. */
export async function casJournalTrace(): Promise<void> {
  const avant = await lireLeJournal(50);

  await poserLesReglages({ ...AUCUN, enabled: false }, OPERATEUR);
  const apresChangement = await lireLeJournal(50);

  const nouvelle = apresChangement.find(
    (ligne) => ligne.reglage === "enabled" && !avant.some((vieille) => vieille.id === ligne.id),
  );

  record(
    "Réglages — un changement écrit son avant, son après et son auteur",
    nouvelle?.apres === "false" && nouvelle.parEmail === OPERATEUR,
    nouvelle
      ? `${nouvelle.avant ?? "—"} → ${nouvelle.apres ?? "—"} par ${nouvelle.parEmail}`
      : "aucune ligne",
  );

  const { changements } = await poserLesReglages({ ...AUCUN, enabled: false }, OPERATEUR);

  record(
    "Réglages — réenregistrer sans rien changer n'encombre pas le journal",
    changements === 0,
    `${changements} changement(s)`,
  );

  await poserLesReglages(AUCUN, OPERATEUR);
}

/**
 * L'état de sortie : aucune surcharge ne survit à la vérification.
 *
 * Le filet reste le piège sur `fetch` — une surcharge qui couperait le mode mock
 * ferait sortir une requête et le cas correspondant tomberait. Celui-ci le dit
 * plus tôt, et plus clairement.
 */
export async function casAucunResteEnBase(): Promise<void> {
  await prisma.reglageJournal.deleteMany({ where: { parEmail: OPERATEUR } });
  const restants = await lireLesReglagesPosés();
  const poses = Object.values(restants).filter((valeur) => valeur !== null);

  record(
    "Réglages — la vérification ne laisse aucune surcharge derrière elle",
    poses.length === 0,
    poses.length === 0 ? "table rendue vide" : `${poses.length} surcharge(s) restante(s)`,
  );
}
