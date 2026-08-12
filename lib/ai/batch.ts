import { recordAiCall } from "@/lib/db/ai-call";
import {
  rendrePlacesDeCompte,
  reserverAppelsModele,
  reserverPlacesDeCompte,
} from "@/lib/db/ai-quota";
import { sdkFor } from "./client";
import { readAiConfig } from "./config";
import { apercuBrut } from "./diagnostic";
import { AIDisabledError, AIQuotaError, AIUserQuotaError } from "./errors";
import { loadFixture } from "./fixtures";
import { lireSortieStructuree } from "./lecture";
import { deposerLotSimule, lotSimulePresent, releverLotSimule } from "./lot-simule";
import { toSdkMessage, type AiMessage } from "./message";
import { toOutputSchema } from "./output-schema";
import { computeCostUsd } from "./pricing";
import type { AiContract } from "./schemas";

/**
 * L'envoi groupé : plusieurs requêtes en une soumission, moitié tarif, contre
 * une latence de quelques minutes à quelques heures.
 *
 * Il ne sert qu'à ce qui peut attendre. Les concepts sont le retour visible du
 * dépôt et partent en appel normal ; les questions ne servent qu'à la première
 * révision, au plus tôt le lendemain.
 *
 * Ce fichier n'importe pas le SDK : il emprunte le client de `client.ts`, qui
 * reste le seul à le connaître. Les garde-fous, eux, sont les mêmes —
 * interrupteur, mode mock, plafond du jour compté par requête, écriture au
 * registre, aucun retry.
 */

export type RequeteGroupee<T> = {
  /** Ce qui relie une réponse à ce qui l'attend. */
  reference: string;
  contract: AiContract<T>;
  system: string;
  messages: AiMessage[];
};

export type ResultatGroupe<T> =
  { reference: string; valeur: T } | { reference: string; motif: string; brut?: string };

export type LotSoumis = { providerId: string; requetes: number };

/**
 * Soumet le lot et rend son identifiant. Les places au plafond sont prises ici,
 * toutes ensemble : un lot à moitié réservé n'aurait aucun sens.
 *
 * `userId` est renseigné quand le lot ne porte que le travail d'un compte —
 * c'est le cas depuis que la soumission à la demande est scopée. Sa part est
 * alors prise avant la place globale, dans le même ordre et pour la même raison
 * que dans `callAI` : la part se rend, la place globale non. Le lot du cron,
 * lui, mélange les comptes et ne passe que le plafond global.
 */
export async function submitAIBatch<T>(
  requetes: RequeteGroupee<T>[],
  userId?: string,
): Promise<LotSoumis> {
  const config = readAiConfig();

  if (!config.enabled) throw new AIDisabledError();

  // Le mode mock passe avant la réservation, comme dans `callAI` : un lot simulé
  // ne dépense rien, il ne doit donc pas entamer le budget du jour. Sinon une
  // journée de développement viderait le plafond sans qu'un appel soit parti.
  if (config.mock) {
    return { providerId: deposerLotSimule(requetes), requetes: requetes.length };
  }

  if (userId) {
    const part = await reserverPlacesDeCompte(userId, config.userDailyCallCap, requetes.length);

    if (!part.obtenue) throw new AIUserQuotaError(part.utilisees, config.userDailyCallCap);
  }

  const reservation = await reserverAppelsModele(config.dailyCallCap, requetes.length);

  if (!reservation.obtenue) {
    if (userId) await rendrePlacesDeCompte(userId, requetes.length);

    throw new AIQuotaError(reservation.utilisees, config.dailyCallCap);
  }

  const lot = await sdkFor(config).messages.batches.create({
    requests: requetes.map((requete) => ({
      custom_id: requete.reference,
      params: {
        model: config.model,
        max_tokens: config.maxTokens,
        system: [{ type: "text", text: requete.system, cache_control: { type: "ephemeral" } }],
        thinking: { type: "disabled" },
        messages: requete.messages.map(toSdkMessage),
        output_config: { format: toOutputSchema(requete.contract.forme) },
      },
    })),
  });

  return { providerId: lot.id, requetes: requetes.length };
}

/** Le lot a-t-il fini de travailler ? */
export async function batchTermine(providerId: string): Promise<boolean> {
  const config = readAiConfig();

  if (config.mock) return lotSimulePresent(providerId);

  const lot = await sdkFor(config).messages.batches.retrieve(providerId);

  return lot.processing_status === "ended";
}

function motifDeLEchec(type: string): string {
  if (type === "errored") return "La requête groupée a échoué chez le fournisseur.";
  if (type === "canceled") return "La requête groupée a été annulée.";
  if (type === "expired") return "La requête groupée a expiré sans réponse.";

  return `La requête groupée s'est terminée en « ${type} ».`;
}

/**
 * Relève les résultats du lot, un par requête, dans le désordre — c'est la
 * référence qui relie chaque réponse à ce qui l'attend, jamais sa position.
 *
 * Chaque réponse écrit sa ligne au registre, à demi-tarif. La dépense n'est
 * connue qu'ici : au moment de soumettre, on ne sait pas ce que le lot coûtera.
 */
export async function readAIBatch<T>(
  providerId: string,
  contract: AiContract<T>,
  jobIdParReference: Map<string, string> = new Map(),
): Promise<ResultatGroupe<T>[]> {
  const config = readAiConfig();

  if (config.mock) {
    return releverLotSimule(providerId).map(({ reference, texte }) => {
      try {
        return { reference, valeur: loadFixture(contract, texte) };
      } catch (erreur) {
        return { reference, motif: erreur instanceof Error ? erreur.message : String(erreur) };
      }
    });
  }

  const resultats: ResultatGroupe<T>[] = [];

  for await (const entree of await sdkFor(config).messages.batches.results(providerId)) {
    const reference = entree.custom_id;
    const ledger = {
      purpose: contract.purpose,
      model: config.model,
      jobId: jobIdParReference.get(reference) ?? null,
    };

    if (entree.result.type !== "succeeded") {
      await recordAiCall({
        ...ledger,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: "0",
        latencyMs: 0,
        success: false,
        errorCode: "AI_BATCH_FAILED",
      });
      resultats.push({ reference, motif: motifDeLEchec(entree.result.type) });
      continue;
    }

    const message = entree.result.message;
    const consommation = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      groupe: true,
    };
    const commun = { ...ledger, ...consommation, latencyMs: 0 };
    const costUsd = computeCostUsd(config.model, consommation);
    const bloc = message.content.find((candidat) => candidat.type === "text");

    try {
      if (message.stop_reason === "max_tokens") throw new Error("Sortie tronquée.");
      if (!bloc || bloc.type !== "text") throw new Error("Aucun texte rendu.");

      const valeur = lireSortieStructuree(contract, bloc.text);
      await recordAiCall({ ...commun, costUsd, success: true });
      resultats.push({ reference, valeur });
    } catch (erreur) {
      await recordAiCall({ ...commun, costUsd, success: false, errorCode: "AI_INVALID_OUTPUT" });
      resultats.push({
        reference,
        motif: erreur instanceof Error ? erreur.message : String(erreur),
        brut: bloc?.type === "text" ? apercuBrut(bloc.text) : undefined,
      });
    }
  }

  return resultats;
}
