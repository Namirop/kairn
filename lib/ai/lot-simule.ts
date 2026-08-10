import { flattenText, type AiMessage } from "./message";

/**
 * Les lots servis en mode mock, le temps que le relevé vienne les chercher.
 *
 * Ils vivent en mémoire du processus : si celui-ci est recyclé entre la
 * soumission et la relève, le lot est perdu et le cron le signalera comme un lot
 * resté sans réponse. C'est exactement ce qu'on veut voir arriver en
 * développement, puisque c'est ce qui peut arriver en vrai.
 */

export type EntreeSimulee = { reference: string; texte: string };

const LOTS = new Map<string, EntreeSimulee[]>();

/** Range le lot et rend son identifiant, comme le ferait le fournisseur. */
export function deposerLotSimule(requetes: { reference: string; messages: AiMessage[] }[]): string {
  const providerId = `mock_batch_${Date.now()}_${LOTS.size}`;

  LOTS.set(
    providerId,
    requetes.map((requete) => ({
      reference: requete.reference,
      texte: flattenText(requete.messages),
    })),
  );

  return providerId;
}

export function lotSimulePresent(providerId: string): boolean {
  return LOTS.has(providerId);
}

/** Relève le lot : une fois lu, il n'est plus là — comme chez le fournisseur. */
export function releverLotSimule(providerId: string): EntreeSimulee[] {
  const lot = LOTS.get(providerId) ?? [];

  LOTS.delete(providerId);

  return lot;
}
