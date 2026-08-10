import { flattenText, type AiMessage } from "./message";

/**
 * Les lots servis en mode mock, le temps que le relevé vienne les chercher.
 *
 * Ils vivent en mémoire du processus : si celui-ci est recyclé entre la
 * soumission et la relève, le lot est perdu et le cron le signalera comme un lot
 * resté sans réponse. C'est exactement ce qu'on veut voir arriver en
 * développement, puisque c'est ce qui peut arriver en vrai.
 *
 * La référence est globale, comme celle du client Prisma : en développement,
 * une action serveur et une route n'exécutent pas la même instance de ce
 * module. Sans elle, un lot déposé depuis l'interface serait introuvable au
 * relevé, et les questions n'arriveraient jamais sans appel réel.
 */

export type EntreeSimulee = { reference: string; texte: string };

declare global {
  var cairnLotsSimules: Map<string, EntreeSimulee[]> | undefined;
}

const LOTS: Map<string, EntreeSimulee[]> = (globalThis.cairnLotsSimules ??= new Map());

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
