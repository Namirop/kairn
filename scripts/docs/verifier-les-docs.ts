/**
 * Liste les docs dont le code couvert a changé sur cette branche.
 *
 *   npm run docs:check           rapport, pour un humain
 *   tsx verifier-les-docs.ts --hook     hook Stop de Claude Code : demande une relecture
 *                                une fois par fichier modifié, puis laisse finir
 *                                le tour
 *
 * « Modifié » veut dire : committé sur la branche depuis `main`, plus les
 * fichiers indexés, non indexés et non suivis. La carte vit dans `carte-des-docs.ts`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { CARTE_DES_DOCS } from "./carte-des-docs";
import {
  noterCommeSignales,
  pasEncoreSignales,
  trouverLesDocsARelire,
  type DejaSignales,
  type DocARelire,
} from "./docs-a-relire";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function lignes(sortie: string): string[] {
  return sortie.split("\n").filter(Boolean);
}

function fichiersModifies(): string[] {
  return [
    ...new Set([
      ...lignes(git("diff", "--name-only", "main...HEAD")),
      ...lignes(git("diff", "--name-only", "HEAD")),
      ...lignes(git("ls-files", "--others", "--exclude-standard")),
    ]),
  ];
}

function cheminsIntrouvables(): string[] {
  const chemins = [...Object.keys(CARTE_DES_DOCS), ...Object.values(CARTE_DES_DOCS).flat()];
  return [...new Set(chemins)].filter((chemin) => !existsSync(chemin));
}

function decrire(aRelire: readonly DocARelire[]): string {
  return aRelire
    .map(({ doc, aCauseDe }) => `- ${doc}, à cause de : ${aCauseDe.join(", ")}`)
    .join("\n");
}

function rapporter(): void {
  const aRelire = trouverLesDocsARelire(fichiersModifies(), CARTE_DES_DOCS);
  const introuvables = cheminsIntrouvables();
  if (aRelire.length === 0) console.log("Aucune doc à relire.");
  else console.log(`Docs à relire :\n${decrire(aRelire)}`);
  if (introuvables.length > 0)
    console.log(`\nChemins de carte-des-docs.ts introuvables : ${introuvables.join(", ")}`);
}

/** Les fichiers signalés, par branche : une nouvelle branche repart de zéro. */
const FichierDesSignalements = z.record(z.string(), z.record(z.string(), z.array(z.string())));
type FichierDesSignalements = z.infer<typeof FichierDesSignalements>;

const EntreeDuHook = z.object({ stop_hook_active: z.boolean().optional() });

function lireLesSignalements(fichier: string): FichierDesSignalements {
  if (!existsSync(fichier)) return {};
  return FichierDesSignalements.parse(JSON.parse(readFileSync(fichier, "utf8")));
}

function retenirLeTour(): void {
  // Un tour que le hook a déjà arrêté une fois finit librement : pas de boucle.
  if (EntreeDuHook.parse(JSON.parse(readFileSync(0, "utf8"))).stop_hook_active) return;

  const branche = git("branch", "--show-current");
  const fichier = git("rev-parse", "--git-path", "kairn-docs-reported.json");
  const parBranche = lireLesSignalements(fichier);
  const signales: DejaSignales = parBranche[branche] ?? {};
  const nouveaux = pasEncoreSignales(
    trouverLesDocsARelire(fichiersModifies(), CARTE_DES_DOCS),
    signales,
  );
  const introuvables = cheminsIntrouvables();
  if (nouveaux.length === 0 && introuvables.length === 0) return;

  writeFileSync(
    fichier,
    JSON.stringify({ ...parBranche, [branche]: noterCommeSignales(signales, nouveaux) }, null, 2),
  );
  const parties = [
    nouveaux.length > 0
      ? `Ces docs couvrent du code modifié sur cette branche et n'ont pas bougé :\n${decrire(nouveaux)}\nRelis les passages concernés et mets-les à jour si ce qu'ils disent n'est plus vrai. Si rien n'a changé pour eux, dis-le en une ligne et termine.`
      : "",
    introuvables.length > 0
      ? `Chemins de scripts/docs/carte-des-docs.ts qui n'existent plus : ${introuvables.join(", ")}. Corrige la carte.`
      : "",
  ];
  console.log(JSON.stringify({ decision: "block", reason: parties.filter(Boolean).join("\n\n") }));
}

if (process.argv.includes("--hook")) retenirLeTour();
else rapporter();
