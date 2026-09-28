import "dotenv/config";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "@playwright/test";
import type { CibleDeFormat, DepotDeDemo } from "@/scripts/assets/cibles-de-capture";
import type { Viewport } from "@/scripts/assets/config";
import { aller, contexte, tirer } from "@/scripts/assets/navigateur";
import {
  deroulerLaSession,
  ecrireEmailDeRappel,
  joindreUneCapture,
  remplirLeDepot,
} from "@/scripts/assets/scenarios";

/** Les écrans capturés, par famille. L'orchestrateur boucle sur les viewports. */

const IMAGE_CAPTURE = path.join(process.cwd(), "scripts", "evaluation", "corpus", "07-capture-assistant.png");
const CARTE = "main section";
const CAIRN = "[data-cairn]";
const HAUTEURS = [1, 5, 20];

export type DonneesDeCapture = {
  depots: DepotDeDemo[];
  formats: CibleDeFormat[];
  texteDuSujet: (cle: string) => string;
  email: { due: number; streak: number };
};

/** Un format fermé se montre juste et faux ; un format ouvert, révélé. */
function etatsPourFormat(format: string): string[] {
  return format === "MCQ" || format === "TRUE_FALSE" || format === "CLOZE"
    ? ["juste", "faux"]
    : ["revele"];
}

export async function capturerPubliques(browser: Browser, viewport: Viewport): Promise<void> {
  const ctx = await contexte(browser, viewport, false);
  const page = await ctx.newPage();

  await aller(page, "/");
  await tirer(page, { viewport, ecran: "landing" });

  await aller(page, "/tarifs");
  await tirer(page, { viewport, ecran: "offres" });

  await ctx.close();
}

export async function capturerConnectees(
  browser: Browser,
  viewport: Viewport,
  donnees: DonneesDeCapture,
): Promise<void> {
  const ctx = await contexte(browser, viewport, true);
  const page = await ctx.newPage();

  await aller(page, "/aujourdhui");
  await tirer(page, { viewport, ecran: "tableau-aujourdhui" });

  await aller(page, "/reviser");
  await tirer(page, { viewport, ecran: "session-en-cours" });

  await aller(page, "/depots");
  await tirer(page, { viewport, ecran: "ce-que-tu-as-depose" });

  for (const depot of donnees.depots) {
    await aller(page, `/depots/${depot.id}`);
    await tirer(page, { viewport, ecran: "concepts", sujet: depot.cle, depotSource: depot.cle });
  }

  await aller(page, "/depots/nouveau");
  await tirer(page, { viewport, ecran: "depot-vide" });

  for (const depot of donnees.depots) {
    if (depot.estImage) {
      await joindreUneCapture(page, IMAGE_CAPTURE);
      await tirer(page, { viewport, ecran: "depot-capture", sujet: depot.cle, depotSource: depot.cle });
    } else {
      await remplirLeDepot(page, donnees.texteDuSujet(depot.cle));
      await tirer(page, { viewport, ecran: "depot-colle", sujet: depot.cle, depotSource: depot.cle });
    }
  }

  for (const cible of donnees.formats) {
    for (const etat of etatsPourFormat(cible.format)) {
      await aller(page, `/apercu/question/${cible.variantId}?etat=${etat}`);
      await tirer(page, {
        viewport,
        ecran: "question",
        sujet: `${cible.format.toLowerCase()}-${etat}`,
        format: cible.format,
        selecteur: CARTE,
      });
    }
  }

  for (const hauteur of HAUTEURS) {
    await aller(page, `/apercu/cairn/${hauteur}`);
    await tirer(page, { viewport, ecran: "cairn", sujet: `${hauteur}-pierres`, selecteur: CAIRN });
  }

  const url = ecrireEmailDeRappel(donnees.email.due, donnees.email.streak, tmpdir());
  await aller(page, url);
  await tirer(page, { viewport, ecran: "email-rappel" });

  await ctx.close();
}

export async function capturerFinDeSession(browser: Browser, viewport: Viewport): Promise<void> {
  const ctx = await contexte(browser, viewport, true);
  const page = await ctx.newPage();

  await deroulerLaSession(page);
  await tirer(page, { viewport, ecran: "fin-de-session" });

  await aller(page, "/aujourdhui");
  await tirer(page, { viewport, ecran: "tableau-journee-faite" });

  await ctx.close();
}
