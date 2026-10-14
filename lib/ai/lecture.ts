import { apercuBrut, decrireIssues } from "./diagnostic";
import { SortieInvalideError } from "./errors";
import type { ContratDeSortie } from "./schemas";

/**
 * La lecture d'une sortie structurée, une fois le texte en main.
 *
 * La grammaire garantit la forme, pas le contenu : les bornes qu'elle ne sait
 * pas imposer partent en description (voir `schema-de-sortie.ts`), et certains
 * modèles ne sont pas contraints du tout. La validation Zod reste donc.
 */
export function lireSortieStructuree<T>(contract: ContratDeSortie<T>, texte: string): T {
  let rendu: unknown;

  try {
    rendu = JSON.parse(texte);
  } catch {
    throw new SortieInvalideError(
      contract.purpose,
      ["(racine) : la réponse n'est pas du JSON"],
      apercuBrut(texte),
    );
  }

  const parsed = contract.validation.safeParse(rendu);

  if (!parsed.success) {
    throw new SortieInvalideError(
      contract.purpose,
      decrireIssues(parsed.error, rendu),
      apercuBrut(rendu),
    );
  }

  return parsed.data;
}
