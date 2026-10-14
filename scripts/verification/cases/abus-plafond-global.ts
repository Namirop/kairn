import { callAI } from "@/lib/ai/client";
import {
  AppelModeleError,
  PlafondGlobalAtteintError,
  PartDuCompteEpuiseeError,
} from "@/lib/ai/errors";
import { PROMPTS_SYSTEME_FR } from "@/lib/ai/prompts";
import { CONTRAT_D_EXTRACTION } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/client";
import { lirePlacesDeCompte, lireReservationsDuJour } from "@/lib/db/ai-quota";
import { lireUsageDeLaPeriode } from "@/lib/db/periode-du-compte";
import { deposer } from "@/lib/depots/deposer";
import { enModeCompteur, viderLeCompte } from "./abus-fabrique";
import { executerToutLePipeline, formulaire } from "./depot-simule";
import { noter } from "./journal";

/**
 * `AI_DAILY_CALL_CAP` est global : il protège le budget, et fait de chaque
 * compte le voisin de tous les autres. Ces cas disent ce qui arrive au second
 * quand le premier a tout pris. Le plafond est ramené à une place et
 * l'émission ne va nulle part (voir `enModeCompteur`).
 */

const FUSEAU = "Europe/Paris";

const PARAGRAPHE = `Une requête HTTP conditionnelle envoie \`If-None-Match\` avec l'étiquette reçue à la
réponse précédente. Le serveur compare, et répond 304 sans corps quand la ressource n'a pas changé.
Le navigateur sert alors sa copie, ce qui économise la bande passante mais pas l'aller-retour.`;

export async function casVoisinBloquant(premier: string, second: string): Promise<void> {
  await viderLeCompte(premier);
  await viderLeCompte(second);

  await enModeCompteur(1, async () => {
    const gourmand = await deposer(
      premier,
      formulaire({ texte: PARAGRAPHE, cleEnvoi: "verif-global-premier" }),
    );

    if (!gourmand.ok) throw new Error(`Le premier dépôt a été refusé : ${gourmand.motif}`);

    await executerToutLePipeline(gourmand.inputId);

    const voisin = await deposer(
      second,
      formulaire({ texte: PARAGRAPHE, cleEnvoi: "verif-global-second" }),
    );

    noter(
      "Plafond global — le dépôt du voisin est accepté, le plafond ne se voit pas au dépôt",
      voisin.ok,
      voisin.ok ? "accepté" : voisin.motif,
    );

    if (!voisin.ok) return;

    await executerToutLePipeline(voisin.inputId);

    const depot = await prisma.input.findUniqueOrThrow({
      where: { id: voisin.inputId },
      select: { status: true, failureReason: true },
    });
    const jobs = await prisma.generationJob.findMany({
      where: { inputId: voisin.inputId },
      select: { status: true, attempts: true, lastError: true },
    });
    const usage = await lireUsageDeLaPeriode(second, FUSEAU);

    noter(
      "Plafond global — le dépôt du voisin n'est pas déclaré en échec",
      depot.status !== "FAILED",
      `${depot.status} — « ${depot.failureReason ?? "aucun motif"} », au registre : ${jobs[0]?.lastError ?? "rien"}`,
    );

    noter(
      "Plafond global — le dépôt du voisin est remis en file, pas perdu",
      jobs.length > 0 && jobs.every((job) => job.status === "QUEUED"),
      jobs.map((job) => `${job.status} après ${job.attempts} tentative(s)`).join(", "),
    );

    noter(
      "Plafond global — un report ne consomme pas de tentative",
      jobs.every((job) => job.attempts === 0),
      jobs.map((job) => `${job.attempts} tentative(s)`).join(", "),
    );

    // Sa place reste prise : son travail est à faire, pas perdu. Le
    // remboursement est pour ce qui ne se fera jamais.
    noter(
      "Plafond global — le voisin garde sa place puisqu'il garde son travail",
      usage.depots === 1,
      `${usage.depots} dépôt(s) comptés pour un dépôt qui attend`,
    );

    noter(
      "Plafond global — la part de compte prise pour rien est rendue",
      (await lirePlacesDeCompte(second)) === 0,
      `${await lirePlacesDeCompte(second)} place(s) de compte retenue(s)`,
    );
  });
}

/**
 * La part par compte, éprouvée seule : le plafond global protège le budget, pas
 * un compte de son voisin. Un compte arrêté à sa part laisse la journée ouverte
 * aux autres.
 */
export async function casPartDuCompte(gourmand: string, voisin: string): Promise<void> {
  await viderLeCompte(gourmand);
  await viderLeCompte(voisin);

  const partDeCompte = 2;

  process.env.AI_DAILY_CALL_CAP_PAR_COMPTE = String(partDeCompte);

  // Posé au-dessus de ce qui est déjà pris : le banc d'évaluation dépense sur
  // la même journée UTC, et un plafond absolu finirait dépassé pour une raison
  // étrangère au cas. Celui de `casVoisinBloquant` reste absolu : il veut la
  // journée pleine.
  const large = 50 + (await lireReservationsDuJour());

  try {
    await enModeCompteur(large, async () => {
      // Pour la même raison, on mesure ce que ce bloc ajoute au compteur.
      const avant = await lireReservationsDuJour();
      const refus: string[] = [];

      for (let tour = 0; tour < partDeCompte + 2; tour += 1) {
        try {
          await callAI({
            contract: CONTRAT_D_EXTRACTION,
            system: PROMPTS_SYSTEME_FR.extract_atoms,
            userId: gourmand,
            messages: [{ role: "user", content: PARAGRAPHE }],
          });
        } catch (erreur) {
          refus.push(erreur instanceof AppelModeleError ? erreur.code : "inconnu");
        }
      }

      const prisesParLeGourmand = await lirePlacesDeCompte(gourmand);
      const globales = (await lireReservationsDuJour()) - avant;

      noter(
        `Part de compte — un seul compte ne prend que ses ${partDeCompte} places`,
        prisesParLeGourmand === partDeCompte &&
          refus.filter((code) => code === "AI_USER_QUOTA").length === 2,
        `${prisesParLeGourmand} place(s) de compte, refus : ${refus.join(", ")}`,
      );

      noter(
        "Part de compte — le plafond global reste ouvert pour les autres",
        globales === partDeCompte,
        `${globales} place(s) globales ajoutées, sur ${large} ouvertes`,
      );

      let voisinServi = true;

      try {
        await callAI({
          contract: CONTRAT_D_EXTRACTION,
          system: PROMPTS_SYSTEME_FR.extract_atoms,
          userId: voisin,
          messages: [{ role: "user", content: PARAGRAPHE }],
        });
      } catch (erreur) {
        // En mode compteur l'émission échoue faute de clé ; seul compte qu'elle
        // ait été autorisée à partir.
        voisinServi =
          !(erreur instanceof PartDuCompteEpuiseeError) &&
          !(erreur instanceof PlafondGlobalAtteintError);
      }

      noter(
        "Part de compte — le voisin passe malgré la gourmandise du premier",
        voisinServi && (await lirePlacesDeCompte(voisin)) === 1,
        voisinServi ? "servi" : "bloqué par le compte d'à côté",
      );
    });
  } finally {
    delete process.env.AI_DAILY_CALL_CAP_PAR_COMPTE;
  }
}
