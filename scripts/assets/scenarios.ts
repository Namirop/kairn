import "dotenv/config";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "@playwright/test";
import type { Langue } from "@/lib/db/types";
import { renderDailyReminder } from "@/lib/email/templates/daily-reminder";
import { aller } from "@/scripts/assets/navigateur";

/**
 * Les gestes de capture qui demandent plus qu'une navigation : remplir un dépôt,
 * y joindre une capture, dérouler une session jusqu'au bout, rendre l'email.
 */

/** Ouvre le dépôt et colle un texte, sans envoyer : c'est l'écran d'avant. */
export async function remplirLeDepot(page: Page, texte: string): Promise<void> {
  await aller(page, "/depots/nouveau");
  await page.locator('textarea[name="texte"]').fill(texte);
  await page.locator('textarea[name="texte"]').blur();
}

/** Ouvre le dépôt et y joint une image, sans envoyer. */
export async function joindreUneCapture(page: Page, cheminImage: string): Promise<void> {
  await aller(page, "/depots/nouveau");
  await page.locator("input#image").setInputFiles(cheminImage);
}

/** Rend l'email de rappel avec les vrais chiffres du compte, et rend son URL locale. */
export function ecrireEmailDeRappel(
  dueCount: number,
  currentStreak: number,
  dossier: string,
  langue: Langue,
): string {
  const rendu = renderDailyReminder(
    { dueCount, currentStreak },
    { sessionUrl: "https://kairn.app/reviser", unsubscribeUrl: "https://kairn.app/desinscription" },
    langue,
  );
  const fichier = path.join(dossier, "email-de-rappel.html");

  writeFileSync(fichier, rendu.html);

  return pathToFileURL(fichier).href;
}

/** Rejoue le seed dans un processus séparé, pour restaurer une session pleine. */
export function resemerLeCompte(): void {
  spawnSync("npm run assets:seed", { shell: true, stdio: "ignore" });
}

async function cliquerLePremier(page: Page, libelles: string[]): Promise<boolean> {
  for (const libelle of libelles) {
    const bouton = page.getByRole("button", { name: libelle, exact: false });

    if ((await bouton.count()) > 0 && (await bouton.first().isVisible())) {
      await bouton.first().click();
      return true;
    }
  }

  return false;
}

/**
 * Répond à toutes les questions dues jusqu'à la fin de session.
 *
 * La session de démo ne sert que des textes à trou et des vrai/faux : on remplit
 * ou on choisit, puis on enchaîne. On note souvent faux à dessein — peu importe,
 * on veut atteindre l'écran de fin, pas un score.
 */
export async function deroulerLaSession(page: Page): Promise<void> {
  await aller(page, "/reviser");

  for (let pas = 0; pas < 30; pas += 1) {
    const trou = page.locator("#trou");

    if ((await trou.count()) > 0 && (await trou.first().isVisible())) {
      await trou.first().fill("réponse");
      await cliquerLePremier(page, ["Vérifier"]);
      await page.waitForTimeout(250);
      if (!(await cliquerLePremier(page, ["Continuer", "Terminer", "Je ne l'avais pas"]))) break;
      await page.waitForTimeout(250);
      continue;
    }

    const options = page.locator("main li button");

    if ((await options.count()) > 0) {
      await options.first().click();
      await page.waitForTimeout(250);
      if (!(await cliquerLePremier(page, ["Continuer", "Terminer"]))) break;
      await page.waitForTimeout(250);
      continue;
    }

    break;
  }
}
