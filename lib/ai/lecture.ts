import { apercuBrut, decrireIssues } from "./diagnostic";
import { AIInvalidOutputError } from "./errors";
import type { AiContract } from "./schemas";

/**
 * La lecture d'une sortie structurée, une fois le texte en main.
 *
 * La grammaire garantit la forme, pas le contenu : le SDK rétrograde en
 * description ce qu'elle ne sait pas contraindre, et une réponse peut être bien
 * empaquetée et fausse. La validation Zod reste donc, appel normal comme envoi
 * groupé — c'est le même contrat des deux côtés.
 */
export function lireSortieStructuree<T>(contract: AiContract<T>, texte: string): T {
  let rendu: unknown;

  try {
    rendu = JSON.parse(texte);
  } catch {
    throw new AIInvalidOutputError(
      contract.purpose,
      ["(racine) : la réponse n'est pas du JSON"],
      apercuBrut(texte),
    );
  }

  const parsed = contract.validation.safeParse(rendu);

  if (!parsed.success) {
    throw new AIInvalidOutputError(
      contract.purpose,
      decrireIssues(parsed.error, rendu),
      apercuBrut(rendu),
    );
  }

  return parsed.data;
}
