import type { CarteDesDocs } from "./carte-des-docs";

/** Une doc dont le code couvert a changé sans qu'elle bouge elle-même. */
export type DocARelire = { doc: string; aCauseDe: string[] };

/** Les fichiers déjà signalés, par doc, pour ne pas répéter le même avertissement. */
export type DejaSignales = Readonly<Record<string, readonly string[]>>;

export function estCouvert(fichier: string, motif: string): boolean {
  return motif.endsWith("/") ? fichier.startsWith(motif) : fichier === motif;
}

export function trouverLesDocsARelire(
  modifies: readonly string[],
  carte: CarteDesDocs,
): DocARelire[] {
  const uniques = [...new Set(modifies)];
  const touches = new Set(uniques);
  return Object.entries(carte)
    .filter(([doc]) => !touches.has(doc))
    .map(([doc, motifs]) => ({
      doc,
      aCauseDe: uniques.filter((fichier) => motifs.some((m) => estCouvert(fichier, m))).sort(),
    }))
    .filter((aRelire) => aRelire.aCauseDe.length > 0);
}

/** Ne garde, pour chaque doc, que les fichiers pas encore signalés. */
export function pasEncoreSignales(
  aRelire: readonly DocARelire[],
  signales: DejaSignales,
): DocARelire[] {
  return aRelire
    .map(({ doc, aCauseDe }) => {
      const deja = new Set(signales[doc] ?? []);
      return { doc, aCauseDe: aCauseDe.filter((fichier) => !deja.has(fichier)) };
    })
    .filter((d) => d.aCauseDe.length > 0);
}

export function noterCommeSignales(
  signales: DejaSignales,
  aRelire: readonly DocARelire[],
): DejaSignales {
  const suivant: Record<string, string[]> = {};
  for (const [doc, fichiers] of Object.entries(signales)) suivant[doc] = [...fichiers];
  for (const { doc, aCauseDe } of aRelire) {
    suivant[doc] = [...new Set([...(suivant[doc] ?? []), ...aCauseDe])].sort();
  }
  return suivant;
}
