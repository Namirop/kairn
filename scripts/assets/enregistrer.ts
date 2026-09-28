import "dotenv/config";
import type { Page } from "@playwright/test";
import { prisma } from "@/lib/db/client";
import { depotsDeDemo } from "@/scripts/assets/cibles-de-capture";
import { enregistrer, type Coupure } from "@/scripts/assets/enregistreur";
import { aller, ouvrirLeNavigateur } from "@/scripts/assets/navigateur";
import { resemerLeCompte } from "@/scripts/assets/scenarios";

/**
 * Les enregistrements vidéo de la banque d'assets, en viewport mobile.
 *
 * Le dépôt garde la vraie génération : le serveur dev doit tourner avec
 * MOCK_AI=false et AI_ENABLED=true. Les trois autres scènes ne dépensent rien.
 *
 *   MOCK_AI=false AI_ENABLED=true ASSETS_PREVIEW=1 npm run dev   # un terminal
 *   npm run assets:videos                                        # un autre
 */

const TEXTE_DEPOT =
  "Le mot anglais « serendipity » désigne le fait de faire une découverte heureuse et inattendue en cherchant tout autre chose. On le doit à l'écrivain Horace Walpole, en 1754.";

async function tapBouton(page: Page, libelles: string[]): Promise<boolean> {
  for (const libelle of libelles) {
    const bouton = page.getByRole("button", { name: libelle, exact: false });

    if ((await bouton.count()) > 0 && (await bouton.first().isVisible())) {
      await bouton.first().tap();
      return true;
    }
  }

  return false;
}

/** Dépôt d'un texte jusqu'à l'affichage des concepts, vraie génération. */
async function scenarioDepot(page: Page, marquer: (label: string) => number): Promise<Coupure[]> {
  await aller(page, "/depots/nouveau");
  await page.waitForTimeout(900);
  await page.locator('textarea[name="texte"]').tap();
  await page.locator('textarea[name="texte"]').fill(TEXTE_DEPOT);
  await page.waitForTimeout(800);

  await tapBouton(page, ["Déposer"]);
  const debut = marquer("attente-debut");
  await page.waitForURL(/\/depots\/[a-z0-9]+$/i, { timeout: 15000 }).catch(() => undefined);
  await page.waitForSelector("main li", { timeout: 90000 });
  const fin = marquer("attente-fin");
  await page.waitForTimeout(2000);

  return [{ debutMs: debut + 900, finMs: fin - 300 }];
}

/** Une session de trois questions. */
async function scenarioSession(page: Page): Promise<Coupure[]> {
  await aller(page, "/reviser");
  await page.waitForTimeout(1100);

  for (let question = 0; question < 3; question += 1) {
    const trou = page.locator("#trou");

    if ((await trou.count()) > 0 && (await trou.first().isVisible())) {
      await trou.first().tap();
      await trou.first().fill("réponse");
      await page.waitForTimeout(600);
      await tapBouton(page, ["Vérifier"]);
      await page.waitForTimeout(800);
      await tapBouton(page, ["Continuer", "Terminer", "Je ne l'avais pas"]);
    } else {
      await page.locator("main li button").first().tap();
      await page.waitForTimeout(800);
      await tapBouton(page, ["Continuer", "Terminer"]);
    }

    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(1200);
  return [];
}

/** Le cairn qui gagne une pierre : la pierre du sommet se pose à l'ouverture. */
async function scenarioCairn(page: Page): Promise<Coupure[]> {
  await aller(page, "/apercu/cairn/8");
  await page.waitForTimeout(2600);
  return [];
}

/** Défilement de la liste des concepts. */
function scenarioScroll(depotId: string): (page: Page) => Promise<Coupure[]> {
  return async (page) => {
    await aller(page, `/depots/${depotId}`);
    await page.waitForTimeout(1200);

    for (let pas = 0; pas < 8; pas += 1) {
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(360);
    }

    await page.waitForTimeout(900);
    return [];
  };
}

async function main(): Promise<void> {
  const depots = await depotsDeDemo();
  const listeRiche = depots.find((depot) => depot.cle === "cours-histoire") ?? depots[0];

  if (!listeRiche) {
    console.error("Aucun dépôt de démo. Lance d'abord : npm run assets:seed");
    process.exit(1);
  }

  const scenes = [
    { nom: "cairn-gagne-une-pierre", connecte: true, deroule: scenarioCairn },
    { nom: "defilement-concepts", connecte: true, deroule: scenarioScroll(listeRiche.id) },
    { nom: "session-trois-questions", connecte: true, deroule: scenarioSession },
    { nom: "depot-jusqu-aux-concepts", connecte: true, deroule: scenarioDepot },
  ];

  // Sans argument, tout ; sinon, seulement les scènes dont le nom contient un filtre.
  const filtres = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const aFaire = filtres.length > 0 ? scenes.filter((s) => filtres.some((f) => s.nom.includes(f))) : scenes;

  const browser = await ouvrirLeNavigateur();

  try {
    for (const scene of aFaire) {
      console.info(`… ${scene.nom}`);
      await enregistrer(browser, scene);
    }

    // La session et le dépôt modifient le compte : on ressème pour le laisser plein.
    if (aFaire.some((s) => s.nom.includes("session") || s.nom.includes("depot"))) {
      resemerLeCompte();
    }

    console.info("Vidéos terminées.");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  console.error("Les vidéos ont échoué.", erreur);
  process.exitCode = 1;
});
