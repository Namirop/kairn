import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { SEED_USER_ID } from "@/prisma/seed/account";
import {
  capturerConnectees,
  capturerFinDeSession,
  capturerPubliques,
  type DonneesDeCapture,
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
 */

const VIEWPORTS_ORDRE = ["mobile", "bureau"] as const;

async function rassemblerLesDonnees(now: Date): Promise<DonneesDeCapture> {
  const [depots, formats] = await Promise.all([depotsDeDemo(), variantesParFormat()]);
  const fige = lireFigeDAssets();
  const stats = await prisma.userStats.findUnique({
    where: { userId: SEED_USER_ID },
    select: { currentStreak: true },
  });
  const due = await prisma.atom.count({
    where: {
      userId: SEED_USER_ID,
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
  };
}

async function main(): Promise<void> {
  const browser = await ouvrirLeNavigateur();

  try {
    const donnees = await rassemblerLesDonnees(new Date());

    if (donnees.depots.length === 0) {
      console.error("Aucun dépôt de démo. Lance d'abord : npm run assets:seed");
      process.exit(1);
    }

    for (const viewport of VIEWPORTS_ORDRE) {
      console.info(`— ${viewport} —`);
      await capturerPubliques(browser, viewport);
      await capturerConnectees(browser, viewport, donnees);
    }

    // La fin de session consomme les échéances du jour : on ressème avant chaque
    // viewport pour repartir d'une session pleine, puis une dernière fois pour
    // laisser le compte prêt à montrer.
    for (const viewport of VIEWPORTS_ORDRE) {
      console.info(`— fin de session (${viewport}) —`);
      resemerLeCompte();
      try {
        await capturerFinDeSession(browser, viewport);
      } catch (erreur) {
        console.warn(`Fin de session ${viewport} non capturée :`, erreur);
      }
    }

    resemerLeCompte();
    console.info("Captures terminées.");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  console.error("Les captures ont échoué.", erreur);
  process.exitCode = 1;
});
