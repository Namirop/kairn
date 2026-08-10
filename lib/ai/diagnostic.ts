import type { ZodError } from "zod";

/**
 * Ce qu'on garde d'une sortie refusée.
 *
 * Lire la plainte de Zod sans voir ce que le modèle a rendu, c'est diagnostiquer
 * à l'aveugle : « expected array, received string » ne dit pas si le tableau est
 * arrivé en texte, ni quelle valeur d'énumération a été inventée. On journalise
 * donc les deux, la plainte et la valeur reçue à l'endroit exact du refus.
 */

const APERCU_MAX = 1000;
const APERCU_VALEUR = 160;

/** La sortie du modèle, mise à plat et tronquée. */
export function apercuBrut(entree: unknown, max = APERCU_MAX): string {
  const texte = typeof entree === "string" ? entree : JSON.stringify(entree);

  if (texte === undefined) return String(entree);

  return texte.length > max ? `${texte.slice(0, max)}… (${texte.length} signes en tout)` : texte;
}

function entrer(valeur: unknown, cle: PropertyKey): unknown {
  return typeof valeur === "object" && valeur !== null ? Reflect.get(valeur, cle) : undefined;
}

/** Une ligne par refus : le chemin, la plainte, et ce qui se trouvait là. */
export function decrireIssues(error: ZodError, entree: unknown): string[] {
  return error.issues.map((issue) => {
    const chemin = issue.path.join(".") || "(racine)";
    const recu = issue.path.reduce<unknown>((valeur, cle) => entrer(valeur, cle), entree);

    return `${chemin} : ${issue.message} — reçu ${apercuBrut(recu, APERCU_VALEUR)}`;
  });
}
