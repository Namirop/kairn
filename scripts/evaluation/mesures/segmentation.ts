/**
 * La découpe d'un dépôt en segments comparables. Déterministe et testée : un
 * segment qui se scinde entre deux passages fait apparaître un manque qui
 * n'existe pas, et deux rapports cessent de se comparer.
 *
 * Aucun filtrage de contenu : une ligne de remplissage doit ressortir
 * « anodine » chez le juge de résidu, pas disparaître avant d'être jugée. Les
 * titres markdown gardent leur texte, qui porte du sens.
 */

/** Sous cette longueur, un fragment est recollé à son voisin plutôt que compté seul. */
export const LONGUEUR_MINIMALE = 40;

/** Une puce de liste, quelle que soit sa marque : `-`, `*`, `1.`, `1)`. */
const PUCE = /^\s*(?:[-*+•]|\d+[.)])\s+/;

/** Les dièses d'un titre markdown, et le soulignement `===` ou `---` d'un titre alterné. */
const DIESES = /^\s*#{1,6}\s+/;
const SOULIGNEMENT = /^\s*(?:=+|-{3,})\s*$/;

/** Fin de phrase : ponctuation forte, guillemets ou parenthèse fermante admis après. */
const FIN_DE_PHRASE = /(?<=[.!?…])["»')\]]*\s+/;

/**
 * Les unités du texte, avant la découpe en phrases.
 *
 * Un retour à la ligne n'est pas une frontière : un article collé avec des
 * retours durs (`03-article-colle.md`) donnerait des bouts de phrase
 * qu'aucun concept ne couvre, et la couverture mesurerait la mise en forme.
 * Seuls une ligne vide, un titre ou une puce ferment une unité ; un titre en
 * forme une à lui seul, une puce en ouvre une que ses continuations rejoignent.
 */
function unites(texte: string): string[] {
  const rendues: string[] = [];
  let courante: string[] = [];

  const fermer = (): void => {
    if (courante.length > 0) rendues.push(courante.join(" "));
    courante = [];
  };

  for (const brute of texte.split("\n")) {
    const ligne = brute.trim();

    if (ligne.length === 0 || SOULIGNEMENT.test(ligne)) {
      fermer();
      continue;
    }

    if (DIESES.test(ligne)) {
      fermer();
      rendues.push(ligne.replace(DIESES, "").trim());
      continue;
    }

    if (PUCE.test(ligne)) {
      fermer();
      courante.push(ligne.replace(PUCE, "").trim());
      continue;
    }

    courante.push(ligne);
  }

  fermer();

  return rendues.filter((unite) => unite.length > 0);
}

function phrases(unite: string): string[] {
  return unite
    .split(FIN_DE_PHRASE)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 0);
}

/**
 * Recolle les fragments trop courts au précédent (« Voir §3. » appartient à ce
 * qui précède), au suivant seulement s'il n'y a pas de précédent. Trois bouts
 * courts d'affilée font un seul segment, c'est voulu.
 */
function recoller(fragments: string[]): string[] {
  const segments: string[] = [];

  for (const fragment of fragments) {
    const precedent = segments.at(-1);

    if (fragment.length < LONGUEUR_MINIMALE && precedent !== undefined) {
      segments[segments.length - 1] = `${precedent} ${fragment}`;
      continue;
    }

    segments.push(fragment);
  }

  // Le premier segment n'avait pas de précédent : trop court, il rejoint le suivant.
  if (segments.length > 1) {
    const premier = segments[0];
    const second = segments[1];

    if (premier !== undefined && second !== undefined && premier.length < LONGUEUR_MINIMALE) {
      return [`${premier} ${second}`, ...segments.slice(2)];
    }
  }

  return segments;
}

/** Les segments d'un dépôt, dans l'ordre du texte. */
export function segmenter(texte: string): string[] {
  return recoller(unites(texte).flatMap(phrases));
}
