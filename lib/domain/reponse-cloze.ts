/**
 * La vérification d'un texte à trou.
 *
 * Elle ne coûte aucun appel modèle : la tolérance a été payée une fois, à la
 * génération, sous la forme d'une liste de formes acceptées. Ici on compare, et
 * c'est tout — instantané, gratuit, et rejouable à l'identique dans un test.
 *
 * Ce qu'on absorbe : la casse, les accents, les espaces en trop, la ponctuation
 * autour, et une faute de frappe sur un mot assez long pour qu'une lettre de
 * travers reste manifestement le même mot. Ce qu'on n'absorbe pas : un mot
 * court à une lettre près — « ver » et « vert » sont deux réponses différentes —
 * ni un nombre de mots qui ne colle pas.
 *
 * Quand la comparaison échoue, l'écran montre le terme attendu et laisse la
 * personne dire « je l'avais ». C'est le seul jugement qu'on lui demande sur ce
 * format, et seulement dans ce cas.
 */

/** Le trou dans la phrase. Trois soulignés : ça se lit, et ça se retape. */
export const TROU = "___";

/**
 * Longueurs à partir desquelles une faute de frappe est tolérée.
 *
 * En deçà de six lettres, aucun écart : sur des mots courts, une lettre change
 * le sens plus souvent qu'elle ne trahit un doigt qui glisse.
 */
const LONGUEUR_UN_ECART = 6;
const LONGUEUR_DEUX_ECARTS = 10;

/**
 * Ce qu'on ramène à la même chose avant de comparer.
 *
 * Le trait d'union et l'apostrophe deviennent des espaces, comme le reste de la
 * ponctuation : personne ne devrait échouer pour avoir écrit « porte greffe »
 * là où le concept dit « porte-greffe ».
 */
export function normaliserReponse(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Le nombre de caractères de travers qu'on laisse passer sur ce mot. */
export function ecartTolere(mot: string): number {
  if (mot.length >= LONGUEUR_DEUX_ECARTS) return 2;
  if (mot.length >= LONGUEUR_UN_ECART) return 1;

  return 0;
}

/** Distance d'édition, en insertions, suppressions et substitutions. */
function distance(attendu: string, saisi: string): number {
  let precedente = Array.from({ length: saisi.length + 1 }, (_, colonne) => colonne);

  for (let ligne = 1; ligne <= attendu.length; ligne += 1) {
    const courante = [ligne];

    for (let colonne = 1; colonne <= saisi.length; colonne += 1) {
      const cout = attendu[ligne - 1] === saisi[colonne - 1] ? 0 : 1;

      courante.push(
        Math.min(
          (precedente[colonne] ?? 0) + 1,
          (courante[colonne - 1] ?? 0) + 1,
          (precedente[colonne - 1] ?? 0) + cout,
        ),
      );
    }

    precedente = courante;
  }

  return precedente[saisi.length] ?? attendu.length;
}

/** Deux textes normalisés, mot à mot, chacun dans sa propre tolérance. */
function correspond(attendu: string, saisi: string): boolean {
  if (attendu === "") return false;

  const motsAttendus = attendu.split(" ");
  const motsSaisis = saisi.split(" ");

  if (motsAttendus.length !== motsSaisis.length) return false;

  return motsAttendus.every(
    (mot, rang) => distance(mot, motsSaisis[rang] ?? "") <= ecartTolere(mot),
  );
}

/**
 * La saisie vaut-elle l'une des formes acceptées ?
 *
 * Une saisie vide ne vaut rien, même si une forme acceptée était vide : ne rien
 * écrire n'est pas une réponse.
 */
export function reponseAcceptee(saisie: string, formes: string[]): boolean {
  const saisi = normaliserReponse(saisie);

  if (saisi === "") return false;

  return formes.some((forme) => correspond(normaliserReponse(forme), saisi));
}
