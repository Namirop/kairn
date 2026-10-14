import { AIInvalidOutputError } from "@/lib/ai/errors";
import type { Echec } from "./depot-evalue";

/**
 * Combien d'éléments le modèle avait rendus dans chaque tableau de sa sortie :
 * quand la validation refuse pour dépassement, c'est le nombre qui dit où poser
 * la borne, et le rapport tronque la sortie brute. Premier niveau seulement.
 */
function compterLesElements(brut: string | undefined): string | undefined {
  if (brut === undefined) return undefined;

  try {
    const lu: unknown = JSON.parse(brut);

    if (typeof lu !== "object" || lu === null) return undefined;

    const tableaux = Object.entries(lu).filter(([, valeur]) => Array.isArray(valeur));

    if (tableaux.length === 0) return undefined;

    return tableaux.map(([nom, valeur]) => `${nom} : ${valeur.length}`).join(", ");
  } catch {
    return "sortie illisible, rien à compter";
  }
}

export function decrire(erreur: unknown): Echec {
  if (erreur instanceof AIInvalidOutputError) {
    return {
      motif: erreur.message,
      brut: erreur.raw,
      elements: compterLesElements(erreur.raw),
    };
  }

  return { motif: erreur instanceof Error ? erreur.message : String(erreur) };
}
