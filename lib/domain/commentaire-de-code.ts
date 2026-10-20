/**
 * Où commence le commentaire d'une ligne de code : la seule nuance d'un bloc,
 * le produit n'ayant qu'un accent. Les commentaires en bloc ne sont pas
 * traités : ils demanderaient un état d'une ligne à l'autre, pour un cas rare.
 */

const DOUBLE_BARRE = ["//"];
const DIESE = ["#"];

/** Ailleurs le dièse est fréquent (CSS, couleur, préprocesseur) : sans langage, double barre. */
const LANGAGES_A_DIESE = new Set([
  "bash",
  "conf",
  "dockerfile",
  "elixir",
  "env",
  "ini",
  "makefile",
  "perl",
  "ps1",
  "powershell",
  "py",
  "python",
  "r",
  "rb",
  "ruby",
  "sh",
  "shell",
  "toml",
  "yaml",
  "yml",
  "zsh",
]);

/** Les langages où deux tirets ouvrent un commentaire. */
const LANGAGES_A_TIRETS = new Set(["ada", "hs", "haskell", "lua", "plpgsql", "psql", "sql"]);

function marques(langage: string | null): string[] {
  if (!langage) return DOUBLE_BARRE;
  if (LANGAGES_A_DIESE.has(langage)) return DIESE;
  if (LANGAGES_A_TIRETS.has(langage)) return ["--"];

  return DOUBLE_BARRE;
}

/**
 * L'indice du commentaire, ou `-1`. La marque doit être hors de toute chaîne,
 * sinon `"https://exemple.fr"` serait coupé en deux.
 */
export function debutDuCommentaire(ligne: string, langage: string | null = null): number {
  const attendues = marques(langage);
  let quote: string | null = null;

  for (let rang = 0; rang < ligne.length; rang += 1) {
    const signe = ligne[rang];

    if (quote) {
      if (signe === "\\") rang += 1;
      else if (signe === quote) quote = null;
      continue;
    }

    if (signe === '"' || signe === "'" || signe === "`") {
      quote = signe;
      continue;
    }

    if (attendues.some((marque) => ligne.startsWith(marque, rang))) return rang;
  }

  return -1;
}
