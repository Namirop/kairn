import { callAI } from "@/lib/ai/client";
import { AiError, AIQuotaError, AIUserQuotaError } from "@/lib/ai/errors";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/client";
import { lirePlacesDeCompte, lireReservationsDuJour } from "@/lib/db/ai-quota";
import { lireUsageDeLaPeriode } from "@/lib/db/quota-depots";
import { deposer } from "@/lib/depots/deposer";
import { enModeCompteur, viderLeCompte } from "./abus-fabrique";
import { executerToutLePipeline, formulaire } from "./depot-simule";
import { record } from "./journal";

/**
 * `AI_DAILY_CALL_CAP` est global au produit : il protège le budget, et il fait
 * de chaque utilisateur le voisin de tous les autres.
 *
 * Ce cas décrit ce qui arrive au second quand le premier a tout pris — quel
 * état, quel message, et si son dépôt est remis en file ou perdu. Le plafond
 * est ramené à une seule place, et l'émission ne va nulle part : voir
 * `enModeCompteur`.
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

    record(
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

    record(
      "Plafond global — le dépôt du voisin n'est pas déclaré en échec",
      depot.status !== "FAILED",
      `${depot.status} — « ${depot.failureReason ?? "aucun motif"} », au registre : ${jobs[0]?.lastError ?? "rien"}`,
    );

    record(
      "Plafond global — le dépôt du voisin est remis en file, pas perdu",
      jobs.length > 0 && jobs.every((job) => job.status === "QUEUED"),
      jobs.map((job) => `${job.status} après ${job.attempts} tentative(s)`).join(", "),
    );

    record(
      "Plafond global — un report ne consomme pas de tentative",
      jobs.every((job) => job.attempts === 0),
      jobs.map((job) => `${job.attempts} tentative(s)`).join(", "),
    );

    // Sa place reste prise, et c'est juste : son travail n'est pas perdu, il est
    // à faire. Le remboursement est pour ce qui ne se fera jamais.
    record(
      "Plafond global — le voisin garde sa place puisqu'il garde son travail",
      usage.depots === 1,
      `${usage.depots} dépôt(s) comptés pour un dépôt qui attend`,
    );

    record(
      "Plafond global — la part de compte prise pour rien est rendue",
      (await lirePlacesDeCompte(second)) === 0,
      `${await lirePlacesDeCompte(second)} place(s) de compte retenue(s)`,
    );
  });
}

/**
 * La réserve par compte, éprouvée seule.
 *
 * C'est le verrou qui manquait : le plafond global protège le budget, il ne
 * protège personne de son voisin. Un compte qui prend sa part et s'arrête laisse
 * la journée ouverte pour les autres — c'est toute la différence entre un
 * plafond de dépense et un déni de service.
 */
export async function casPartDuCompte(gourmand: string, voisin: string): Promise<void> {
  await viderLeCompte(gourmand);
  await viderLeCompte(voisin);

  const partDeCompte = 2;

  process.env.AI_DAILY_CALL_CAP_PAR_COMPTE = String(partDeCompte);

  try {
    await enModeCompteur(50, async () => {
      const refus: string[] = [];

      for (let tour = 0; tour < partDeCompte + 2; tour += 1) {
        try {
          await callAI({
            contract: EXTRACT_ATOMS,
            system: SYSTEM_PROMPTS.extract_atoms,
            userId: gourmand,
            messages: [{ role: "user", content: PARAGRAPHE }],
          });
        } catch (erreur) {
          refus.push(erreur instanceof AiError ? erreur.code : "inconnu");
        }
      }

      const prisesParLeGourmand = await lirePlacesDeCompte(gourmand);
      const globales = await lireReservationsDuJour();

      record(
        `Part de compte — un seul compte ne prend que ses ${partDeCompte} places`,
        prisesParLeGourmand === partDeCompte &&
          refus.filter((code) => code === "AI_USER_QUOTA").length === 2,
        `${prisesParLeGourmand} place(s) de compte, refus : ${refus.join(", ")}`,
      );

      record(
        "Part de compte — le plafond global reste ouvert pour les autres",
        globales === partDeCompte,
        `${globales} place(s) globales prises sur 50`,
      );

      let voisinServi = true;

      try {
        await callAI({
          contract: EXTRACT_ATOMS,
          system: SYSTEM_PROMPTS.extract_atoms,
          userId: voisin,
          messages: [{ role: "user", content: PARAGRAPHE }],
        });
      } catch (erreur) {
        // L'émission échoue faute de clé, c'est le mode compteur. Ce qui compte
        // est qu'elle ait été autorisée à partir.
        voisinServi = !(erreur instanceof AIUserQuotaError) && !(erreur instanceof AIQuotaError);
      }

      record(
        "Part de compte — le voisin passe malgré la gourmandise du premier",
        voisinServi && (await lirePlacesDeCompte(voisin)) === 1,
        voisinServi ? "servi" : "bloqué par le compte d'à côté",
      );
    });
  } finally {
    delete process.env.AI_DAILY_CALL_CAP_PAR_COMPTE;
  }
}
