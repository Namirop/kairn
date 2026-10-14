import { versUnFournisseurDeModele } from "./hotes-des-fournisseurs";
import { noter } from "./journal";

/**
 * Le piège sur `fetch` des scripts `verifier:*` : toute requête vers un
 * fournisseur de modèle est comptée et échoue au lieu de partir, le reste passe.
 * À armer en tête de script, avant le premier import dynamique du code
 * applicatif. Rend la liste des tentatives, que le script lit à la fin.
 */
export function armerLePiegeReseau(): string[] {
  const tentativesReseau: string[] = [];
  const vraiFetch = globalThis.fetch;

  globalThis.fetch = function fetchPiege(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();
    if (!versUnFournisseurDeModele(url)) return vraiFetch(input, init);

    tentativesReseau.push(url);
    return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
  };

  return tentativesReseau;
}

/** Le constat final : aucune tentative n'a été interceptée. */
export function noterLesTentativesReseau(tentativesReseau: readonly string[]): void {
  noter(
    "Aucune requête n'est sortie vers l'API",
    tentativesReseau.length === 0,
    tentativesReseau.length === 0 ? "zéro tentative" : tentativesReseau.join(", "),
  );
}
