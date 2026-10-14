/**
 * Où commence le commentaire d'une ligne de code, s'il y en a un.
 *
 * C'est la seule nuance d'un bloc de code : pas de thème de coloration, le
 * produit n'a qu'un accent. Le commentaire est la partie d'une ligne qui ne
 * s'exécute pas, ce qu'on lit plutôt que ce qu'on recopie.
 *
 * Les commentaires en bloc ne sont pas traités : ils demanderaient un état
 * d'une ligne à l'autre, pour un cas presque absent des extraits courts.
 */

/** Les marques de commentaire d'une ligne, par famille de langage. */
const DOUBLE_BARRE = ["//"];
const DIESE = ["#"];

/**
 * Les langages où le dièse ouvre un commentaire. Ailleurs il est fréquent
 * (sélecteur CSS, couleur, directive de préprocesseur) : sans langage, on s'en
 * tient à la double barre.
 */
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
 * L'indice où commence le commentaire de cette ligne, ou `-1`.
 *
 * La marque doit être hors de toute chaîne, sinon `"https://exemple.fr"` serait
 * coupé en deux. Les trois délimiteurs courants et l'échappement par barre
 * oblique inverse sont suivis.
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
