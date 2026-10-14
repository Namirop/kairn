import type { createTranslator } from "next-intl";
import type { depots } from "@/lib/i18n/messages/fr/depots";

/**
 * Les bornes d'un dépôt, avec ou sans compte.
 *
 * Ce module ne dépend pas de Prisma ni de `sharp` : l'écran et le serveur
 * l'importent tous les deux, pour que le compteur du champ et le refus serveur
 * disent le même nombre. Ces bornes disent ce qu'un geste peut porter ; le
 * budget, lui, est protégé par le quota de concepts.
 */

/**
 * Ce qu'un compte peut coller d'un coup.
 *
 * La limite est la latence, pas le coût : le découpage suit le nombre de
 * concepts (~25 s pour 7 400 signes), et l'écran d'attente renonce à 90 s.
 * À ~338 signes par concept, 16 000 signes donnent ~47 concepts, juste sous
 * `PLAFOND_CONCEPTS_PAR_DEPOT` (50) : les deux bornes se changent ensemble.
 */
export const CARACTERES_MAXIMUM = 16000;

/**
 * Ce qu'un visiteur peut coller : de quoi se découper en une dizaine de
 * secondes. C'est une démonstration, et sur la page qui convertit chaque
 * seconde d'attente coûte des visiteurs.
 */
export const CARACTERES_MAXIMUM_ANONYME = 4000;
export const CARACTERES_MINIMUM_ANONYME = 40;

/**
 * Le poids maximal d'une capture au moment de partir, après réduction dans le
 * navigateur.
 *
 * Quatre mégaoctets parce que l'hébergeur refuse un corps de requête au-delà de
 * 4,5 Mo : il faut laisser la place au texte et au formulaire. En pratique
 * `reduireLaCapture` ramène une capture à quelques centaines de kilooctets ; la
 * borne ne sert que si la réduction a échoué.
 */
export const TAILLE_MAXIMALE_OCTETS = 4 * 1024 * 1024;

/**
 * Le bord long au-delà duquel une capture est réduite, des deux côtés. Au-delà,
 * le modèle facture des pixels sans mieux lire.
 */
export const BORD_LONG_CAPTURE = 1568;

/**
 * Ce qu'une consigne jointe à un dépôt peut faire de long : deux phrases, de quoi
 * cadrer ce qu'il faut retenir. Plus long, ce serait du contenu, qui entrerait en
 * concurrence avec le texte déposé.
 */
export const CONSIGNE_MAXIMUM = 300;

/**
 * Une longueur en signes, convertie en mots : personne ne compte les caractères
 * d'un texte, tout le monde sait ce que pèsent mille mots.
 *
 * Moyenne du français courant (6,5 signes par mot, espace comprise), gardée
 * dans les deux langues pour n'annoncer qu'une borne. Arrondi à la centaine :
 * c'est un ordre de grandeur.
 */
const SIGNES_PAR_MOT = 6.5;

export function motsEnviron(caracteres: number): number {
  return Math.round(caracteres / SIGNES_PAR_MOT / 100) * 100;
}

/**
 * Ce qui cloche dans la longueur d'un essai, ou `null`.
 *
 * Le formulaire l'appelle pour refuser sur place, le serveur pour refuser
 * vraiment : sans ça, un champ vide partait au serveur et affichait une attente
 * pour rien. Le vide a son propre verdict parce que le problème est une
 * absence, pas une quantité.
 */
export type DefautDeLongueur = "vide" | "court" | "long";

export function defautDeLongueur(texte: string): DefautDeLongueur | null {
  const propre = texte.trim();

  if (propre.length === 0) return "vide";
  if (propre.length < CARACTERES_MINIMUM_ANONYME) return "court";
  if (propre.length > CARACTERES_MAXIMUM_ANONYME) return "long";

  return null;
}

/**
 * Le refus de longueur d'un essai. Le refus « trop long » doit dire que c'est la
 * limite de la démonstration et non du produit, qui accepte quatre fois plus
 * avec un compte : sans ça, le visiteur conclut que Kairn refuse les textes
 * longs.
 */
export function motifDeDefaut(defaut: DefautDeLongueur, t: TraduireLesRefus): string {
  if (defaut === "vide") return t("essai.rienADecouper");
  if (defaut === "court") return t("essai.tropCourt");

  return t("essai.tropLong", {
    limiteEssai: longueurEnClairAvec(t, CARACTERES_MAXIMUM_ANONYME),
    limiteCompte: longueurEnClairAvec(t, CARACTERES_MAXIMUM),
  });
}

/** Une longueur en signes et en mots, dite par le traducteur reçu. */
export function longueurEnClairAvec(t: TraduireLesRefus, caracteres: number): string {
  return t("longueurEnClair", { caracteres, mots: motsEnviron(caracteres) });
}

/** Le traducteur de `depots.refus`, quel que soit le côté qui l'a fabriqué. */
export type TraduireLesRefus = ReturnType<
  typeof createTranslator<{ depots: typeof depots }, "depots.refus">
>;
