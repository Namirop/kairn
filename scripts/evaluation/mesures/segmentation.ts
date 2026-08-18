/**
 * La découpe d'un dépôt en segments comparables.
 *
 * Déterministe et volontairement simple. Les mesures de couverture n'ont de sens
 * que si cette découpe ne bouge pas entre deux passages : un segment qui se
 * scinde fait apparaître un manque qui n'existe pas, et deux rapports cessent
 * de se comparer. C'est pour ça qu'elle est ici, isolée et testée, plutôt
 * qu'écrite au fil du calcul.
 *
 * **Aucun filtrage de contenu.** On ne décide pas mécaniquement qu'une ligne est
 * du remplissage : `21-mixte-exploitable-et-organisation` a des lignes de tâches
 * qui doivent ressortir « anodines » chez le juge de résidu, pas disparaître
 * avant d'avoir été jugées. Une ligne écartée ici est une ligne qu'aucune mesure
 * ne verra jamais.
 *
 * Les titres markdown gardent leur texte sans leurs dièses : « ## Le principe »
 * porte du sens, et un dépôt collé depuis un article en est plein.
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
 * **Un retour à la ligne n'est pas une frontière.** `03-article-colle.md` est un
 * article collé tel quel, coupé dur autour de la soixante-dizième colonne : y
 * voir une unité par ligne en fabriquait quarante là où le texte en porte une
 * douzaine, dont « famine, pas un blocage, et elle se lit très mal dans un
 * profileur. » — un bout de phrase qu'aucun concept ne pouvait couvrir. La
 * couverture s'effondrait alors sur la mise en forme du fichier, et non sur ce
 * que le modèle avait oublié.
 *
 * Trois choses ferment une unité, et seulement trois : une ligne vide, un titre,
 * une puce. Tout le reste se recolle avec une espace — c'est du texte qui se
 * poursuit. Un titre forme une unité à lui seul ; une puce en ouvre une, et ses
 * propres lignes de continuation la rejoignent.
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
 * Recolle les fragments trop courts à leur voisin.
 *
 * Au précédent de préférence — « Voir §3. » appartient à ce qui précède —, et au
 * suivant seulement quand il n'y a pas de précédent. Un fragment isolé entre
 * deux fragments courts finit donc dans un segment unique, ce qui est le
 * comportement voulu : trois bouts de titre valent un segment, pas trois.
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

  // Le premier segment peut être resté trop court : rien ne le précédait au
  // moment où il est entré. Il rejoint alors son suivant.
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
