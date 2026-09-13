/**
 * Où commence le commentaire d'une ligne de code, s'il y en a un.
 *
 * **C'est la seule nuance qu'un bloc de code reçoive ici, et c'est la bonne.**
 * Un thème de coloration complet peindrait sept ou huit couleurs dans un produit
 * qui n'en porte qu'une, et cet accent-là est déjà pris. Le commentaire, lui,
 * n'est pas une catégorie grammaticale de plus : c'est la seule partie d'une
 * ligne qui ne s'exécute pas. La distinguer, c'est séparer ce qu'on lit de ce
 * qu'on recopie — et sur l'extrait qui a fait écrire ce module, le commentaire
 * portait toute l'explication.
 *
 * **Les guillemets sont suivis, pas ignorés.** Une recherche naïve de « // »
 * coupe `"https://exemple.fr"` en son milieu et peint la moitié d'une chaîne
 * comme un commentaire. On parcourt donc la ligne en sachant si l'on est dans
 * une chaîne, et une marque à l'intérieur d'une chaîne n'est pas une marque.
 *
 * **Les commentaires en bloc ne sont pas traités.** Ceux qu'ouvre une barre
 * suivie d'une étoile s'étendent sur plusieurs lignes, donc demanderaient de
 * porter un état d'une ligne à l'autre
 * pour un cas qui n'apparaît presque jamais dans un extrait de quelques lignes.
 * Une ligne qui en porte un reste de la couleur du code : lisible, simplement
 * pas mise à part.
 *
 * Fonction pure : elle rend une position, jamais une couleur.
 */

/** Les marques de commentaire d'une ligne, par famille de langage. */
const DOUBLE_BARRE = ["//"];
const DIESE = ["#"];

/**
 * Les langages où le dièse ouvre un commentaire.
 *
 * Ailleurs il ne l'ouvre pas, et il y est même fréquent : un sélecteur
 * d'identifiant en CSS, une couleur, une directive de préprocesseur. Sans nom de
 * langage on s'en tient à la double barre, qui ne veut dire qu'une chose.
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
 * La marque doit être hors de toute chaîne. Les trois délimiteurs des langages
 * courants sont suivis, et l'échappement par barre oblique inverse aussi : sans
 * lui, `"il a dit \\"bonjour\\""` rouvrirait une chaîne au milieu de la ligne et
 * tout ce qui suit passerait pour du texte.
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
