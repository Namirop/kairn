import "dotenv/config";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import type { Langue } from "@/lib/db/types";
import type { CibleDeFormat, DepotDeDemo } from "@/scripts/assets/cibles-de-capture";
import type { Viewport } from "@/scripts/assets/config";
import { aller, contexte, tirer, type OptionsDeTir } from "@/scripts/assets/navigateur";
import {
  deroulerLaSession,
  ecrireEmailDeRappel,
  joindreUneCapture,
  remplirLeDepot,
} from "@/scripts/assets/scenarios";

/** Les écrans capturés, par famille. L'orchestrateur boucle sur les viewports. */

const IMAGE_CAPTURE = path.join(
  process.cwd(),
  "scripts",
  "evaluation",
  "corpus",
  "07-capture-assistant.png",
);
const CARTE = "main section";
const CAIRN = "[data-cairn]";
const HAUTEURS = [1, 5, 20];

/**
 * Ce qu'on capture : la langue de l'interface, et un filtre sur les fichiers,
 * nommés `<viewport>/<ecran>/<sujet ou ecran>` sans extension ni suffixe de
 * langue. Sans filtre, tout passe.
 */
export type Selection = { langue: Langue; garde: (cible: string) => boolean };

export type DonneesDeCapture = {
  depots: DepotDeDemo[];
  formats: CibleDeFormat[];
  texteDuSujet: (cle: string) => string;
  email: { due: number; streak: number };
  selection: Selection;
};

function garde(selection: Selection, options: Pick<OptionsDeTir, "viewport" | "ecran" | "sujet">) {
  return selection.garde(`${options.viewport}/${options.ecran}/${options.sujet ?? options.ecran}`);
}

/** Va à une page et la tire, si la sélection la garde. */
async function allerEtTirer(
  page: Page,
  chemin: string,
  options: OptionsDeTir,
  selection: Selection,
): Promise<void> {
  if (!garde(selection, options)) return;

  await aller(page, chemin);
  await tirer(page, { ...options, langue: selection.langue });
}

/** Un format fermé se montre juste et faux ; un format ouvert, révélé. */
function etatsPourFormat(format: string): string[] {
  return format === "MCQ" || format === "TRUE_FALSE" || format === "CLOZE"
    ? ["juste", "faux"]
    : ["revele"];
}

export async function capturerPubliques(
  navigateur: Browser,
  viewport: Viewport,
  selection: Selection,
): Promise<void> {
  const ctx = await contexte(navigateur, viewport, false);
  const page = await ctx.newPage();

  await allerEtTirer(page, "/", { viewport, ecran: "landing" }, selection);
  await allerEtTirer(page, "/tarifs", { viewport, ecran: "offres" }, selection);

  await ctx.close();
}

/** Le dépôt rempli, juste avant l'envoi : un texte collé ou une capture jointe. */
async function capturerLesDepots(
  page: Page,
  viewport: Viewport,
  donnees: DonneesDeCapture,
): Promise<void> {
  const { selection } = donnees;

  for (const depot of donnees.depots) {
    const ecran = depot.estImage ? "depot-capture" : "depot-colle";
    const options = { viewport, ecran, sujet: depot.cle, depotSource: depot.cle };

    if (!garde(selection, options)) continue;

    if (depot.estImage) await joindreUneCapture(page, IMAGE_CAPTURE);
    else await remplirLeDepot(page, donnees.texteDuSujet(depot.cle));

    await tirer(page, { ...options, langue: selection.langue });
  }
}

export async function capturerConnectees(
  navigateur: Browser,
  viewport: Viewport,
  donnees: DonneesDeCapture,
): Promise<void> {
  const { selection } = donnees;
  const ctx = await contexte(navigateur, viewport, true);
  const page = await ctx.newPage();

  await allerEtTirer(page, "/aujourdhui", { viewport, ecran: "tableau-aujourdhui" }, selection);
  await allerEtTirer(page, "/reviser", { viewport, ecran: "session-en-cours" }, selection);
  await allerEtTirer(page, "/depots", { viewport, ecran: "ce-que-tu-as-depose" }, selection);

  for (const depot of donnees.depots) {
    const options = { viewport, ecran: "concepts", sujet: depot.cle, depotSource: depot.cle };
    await allerEtTirer(page, `/depots/${depot.id}`, options, selection);
  }

  await allerEtTirer(page, "/depots/nouveau", { viewport, ecran: "depot-vide" }, selection);
  await capturerLesDepots(page, viewport, donnees);

  // Au téléphone, la carte tient déjà toute la largeur : on tire l'écran
  // entier, tel qu'on le voit. Au bureau, on recadre sur la carte.
  const selecteur = viewport === "mobile" ? undefined : CARTE;

  for (const cible of donnees.formats) {
    for (const etat of etatsPourFormat(cible.format)) {
      const sujet = `${cible.format.toLowerCase()}-${etat}`;
      const options = { viewport, ecran: "question", sujet, format: cible.format, selecteur };
      await allerEtTirer(
        page,
        `/apercu/question/${cible.variantId}?etat=${etat}`,
        options,
        selection,
      );
    }
  }

  for (const hauteur of HAUTEURS) {
    const options = { viewport, ecran: "cairn", sujet: `${hauteur}-pierres`, selecteur: CAIRN };
    await allerEtTirer(page, `/apercu/cairn/${hauteur}`, options, selection);
  }

  if (garde(selection, { viewport, ecran: "email-rappel" })) {
    const { due, streak } = donnees.email;
    const url = ecrireEmailDeRappel(due, streak, tmpdir(), selection.langue);
    await allerEtTirer(page, url, { viewport, ecran: "email-rappel" }, selection);
  }

  await ctx.close();
}

export async function capturerFinDeSession(navigateur: Browser, viewport: Viewport): Promise<void> {
  const ctx = await contexte(navigateur, viewport, true);
  const page = await ctx.newPage();

  await deroulerLaSession(page);
  await tirer(page, { viewport, ecran: "fin-de-session" });

  await aller(page, "/aujourdhui");
  await tirer(page, { viewport, ecran: "tableau-journee-faite" });

  await ctx.close();
}
