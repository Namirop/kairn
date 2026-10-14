import "dotenv/config";
import type { Browser } from "@playwright/test";
import { prisma } from "@/lib/db/client";
import type { Langue } from "@/lib/db/types";
import { ID_DE_DEMONSTRATION } from "@/prisma/seed/compte-de-demonstration";
import {
  capturerConnectees,
  capturerFinDeSession,
  capturerPubliques,
  type DonneesDeCapture,
  type Selection,
} from "@/scripts/assets/captures";
import { depotsDeDemo, variantesParFormat } from "@/scripts/assets/cibles-de-capture";
import { lireFigeDAssets } from "@/scripts/assets/fige";
import { ouvrirLeNavigateur } from "@/scripts/assets/navigateur";
import { resemerLeCompte } from "@/scripts/assets/scenarios";

/**
 * Les captures fixes de la banque d'assets, aux deux viewports.
 *
 * Le serveur dev doit tourner avec ASSETS_PREVIEW=1 (pour la vitrine) et pointer
 * la même base que le seed. Rien ne dépense : tout est déjà en base.
 *
 *   ASSETS_PREVIEW=1 npm run dev      # dans un terminal
 *   npm run assets:captures           # dans un autre
 *
 * `--langue en` capture l'interface anglaise sur les dépôts anglais (fichiers en
 * `.en`) ; le compte de démo reprend sa langue ensuite. Les pages publiques et
 * la fin de session ne sont capturées qu'en français.
 *
 * `--seulement` ne tire que les fichiers nommés, en `<viewport>/<ecran>/<sujet>` :
 *
 *   npm run assets:captures -- --langue en --seulement mobile/question/mcq-faux
 */

function argument(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);

  return rang === -1 ? undefined : process.argv[rang + 1];
}

function lireLaSelection(): Selection {
  const langue: Langue = argument("--langue")?.toLowerCase() === "en" ? "EN" : "FR";
  const seulement = argument("--seulement");
  const cibles = seulement ? new Set(seulement.split(",").map((cible) => cible.trim())) : null;

  return { langue, garde: (cible) => cibles === null || cibles.has(cible) };
}

const VIEWPORTS_ORDRE = ["mobile", "bureau"] as const;

async function rassemblerLesDonnees(now: Date, selection: Selection): Promise<DonneesDeCapture> {
  const [tous, formats] = await Promise.all([depotsDeDemo(), variantesParFormat(selection.langue)]);
  const depots = tous.filter((depot) => depot.langue === selection.langue);
  const fige = lireFigeDAssets();
  const stats = await prisma.userStats.findUnique({
    where: { userId: ID_DE_DEMONSTRATION },
    select: { currentStreak: true },
  });
  const due = await prisma.atom.count({
    where: {
      userId: ID_DE_DEMONSTRATION,
      due: { lte: now },
      state: { not: "ARCHIVED" },
      variants: { some: { retiredAt: null } },
    },
  });

  return {
    depots,
    formats,
    texteDuSujet: (cle) => fige.find((depot) => depot.cle === cle)?.texte ?? "",
    email: { due, streak: stats?.currentStreak ?? 0 },
    selection,
  };
}

/** Pose la langue du compte de démo et rend celle qu'il avait. */
async function poserLaLangue(langue: Langue): Promise<Langue> {
  const avant = await prisma.userSettings.findUniqueOrThrow({
    where: { userId: ID_DE_DEMONSTRATION },
    select: { langue: true },
  });

  await prisma.userSettings.update({ where: { userId: ID_DE_DEMONSTRATION }, data: { langue } });

  return avant.langue;
}

async function capturerLesFinsDeSession(navigateur: Browser, selection: Selection): Promise<void> {
  const viewports = VIEWPORTS_ORDRE.filter((viewport) =>
    selection.garde(`${viewport}/fin-de-session/fin-de-session`),
  );

  // Ses gestes cliquent des libellés français : pas de fin de session en anglais.
  if (selection.langue !== "FR" || viewports.length === 0) return;

  // La fin de session consomme les échéances du jour : on ressème avant chaque
  // viewport, puis une dernière fois pour laisser le compte prêt à montrer.
  for (const viewport of viewports) {
    console.info(`— fin de session (${viewport}) —`);
    resemerLeCompte();
    try {
      await capturerFinDeSession(navigateur, viewport);
    } catch (erreur) {
      console.warn(`Fin de session ${viewport} non capturée :`, erreur);
    }
  }

  resemerLeCompte();
}

async function main(): Promise<void> {
  const selection = lireLaSelection();
  const navigateur = await ouvrirLeNavigateur();
  const langueDAvant = await poserLaLangue(selection.langue);

  try {
    const donnees = await rassemblerLesDonnees(new Date(), selection);

    if (donnees.depots.length === 0) {
      console.error("Aucun dépôt de démo dans cette langue. Lance d'abord : npm run assets:seed");
      process.exitCode = 1;
      return;
    }

    for (const viewport of VIEWPORTS_ORDRE) {
      console.info(`— ${viewport} —`);
      if (selection.langue === "FR") await capturerPubliques(navigateur, viewport, selection);
      await capturerConnectees(navigateur, viewport, donnees);
    }

    await capturerLesFinsDeSession(navigateur, selection);
    console.info("Captures terminées.");
  } finally {
    await poserLaLangue(langueDAvant);
    await navigateur.close();
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  console.error("Les captures ont échoué.", erreur);
  process.exitCode = 1;
});
