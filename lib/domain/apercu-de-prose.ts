import { blocsDeTexte } from "./blocs-de-texte";
import { type ElementDeProse, elementsDeProse } from "./structure-de-prose";
import { segmentsEnGras } from "./texte-en-gras";

/**
 * Les premiers mots d'un dépôt, ses marques de markdown retirées.
 *
 * **Une liste ne rend pas une structure, elle rend une phrase.** L'écran d'un
 * dépôt lit maintenant ses titres, ses listes et ses tableaux ; la liste, elle,
 * n'a que deux lignes et ne peut rien empiler. Elle montrait donc ce que le
 * rendu venait d'apprendre à cacher — « ## 2. Le dossier `android/` d'un projet
 * Flutter ### 2.1 Gradle… » —, et le même dépôt se lisait proprement à un
 * endroit et en notation brute à l'autre.
 *
 * La réponse n'est pas de rendre la structure en petit, c'est de la **mettre à
 * plat** : on garde les mots, on jette les marques, et les morceaux se séparent
 * par le point médian qui sert déjà partout ailleurs dans le produit. Un titre
 * suivi de son premier paragraphe se lit alors comme une phrase de liste, ce
 * qu'il est.
 *
 * Les accents graves survivent, eux, et c'est voulu : la liste relève les termes
 * de code comme le reste du produit, et c'est le rendu qui s'en charge.
 *
 * Fonction pure : elle rend un texte, jamais un affichage.
 */

/** Ce qui sépare deux morceaux mis à plat. Le point médian de la liste. */
const SEPARATEUR = " · ";

/**
 * Ce qu'on lit avant de couper.
 *
 * Mettre à plat coûte au prorata du texte, et un dépôt fait jusqu'à vingt mille
 * signes pour deux lignes affichées. On en prend de quoi remplir l'aperçu même
 * si les marques en mangent la moitié, et on ignore le reste.
 */
const PREFIXE = 1200;

function sansGras(texte: string): string {
  return segmentsEnGras(texte)
    .map((segment) => segment.texte)
    .join("");
}

/** Un élément ramené à ses mots, dans l'ordre où on les lirait. */
function aPlat(element: ElementDeProse): string {
  if (element.type === "liste") return element.entrees.join(SEPARATEUR);

  if (element.type === "tableau") {
    return [...element.entetes, ...element.lignes.flat()].filter(Boolean).join(SEPARATEUR);
  }

  return element.texte;
}

export function apercuDeProse(texte: string, longueur: number): string {
  const morceaux = blocsDeTexte(texte.slice(0, PREFIXE)).flatMap((bloc) =>
    // Un extrait cité en bloc garde ses mots mais perd ses lignes : sur deux
    // lignes d'aperçu, il n'y a pas de mise en page à respecter.
    bloc.type === "code" ? [bloc.texte] : elementsDeProse(bloc.texte).map(aPlat),
  );

  return sansGras(morceaux.join(SEPARATEUR)).replace(/\s+/g, " ").trim().slice(0, longueur).trim();
}
