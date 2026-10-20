import type { createTranslator } from "next-intl";
import type { depots } from "@/lib/i18n/messages/fr/depots";

/**
 * Les bornes d'un dépôt. Sans Prisma ni `sharp` : l'écran et le serveur
 * l'importent, pour que compteur et refus disent le même nombre. Le budget,
 * lui, est protégé par le quota de concepts.
 */

/**
 * Bornée par la latence, pas le coût : ~25 s pour 7 400 signes, abandon de
 * l'attente à 90 s. À ~338 signes par concept, ~47 concepts, juste sous
 * `PLAFOND_CONCEPTS_PAR_DEPOT` (50) : les deux se changent ensemble.
 */
export const CARACTERES_MAXIMUM = 16000;

/** Une dizaine de secondes de découpage : sur la page qui convertit, chaque seconde coûte. */
export const CARACTERES_MAXIMUM_ANONYME = 4000;
export const CARACTERES_MINIMUM_ANONYME = 40;

/**
 * Après réduction dans le navigateur. Vercel refuse un corps au-delà de 4,5 Mo,
 * il reste de la place pour le formulaire. Ne sert que si `reduireLaCapture`
 * a échoué.
 */
export const TAILLE_MAXIMALE_OCTETS = 4 * 1024 * 1024;

/** Réduite au-delà, des deux côtés : le modèle facturerait des pixels sans mieux lire. */
export const BORD_LONG_CAPTURE = 1568;

/** Deux phrases pour cadrer : plus long, ce serait du contenu concurrent du texte. */
export const CONSIGNE_MAXIMUM = 300;

/**
 * Personne ne compte les signes, tout le monde sait ce que pèsent mille mots.
 * Moyenne du français, espace comprise, gardée en anglais pour n'annoncer
 * qu'une borne.
 */
const SIGNES_PAR_MOT = 6.5;

export function motsEnviron(caracteres: number): number {
  return Math.round(caracteres / SIGNES_PAR_MOT / 100) * 100;
}

/**
 * Appelé par le formulaire pour refuser sur place, et par le serveur. Le vide a
 * son verdict : c'est une absence, pas une quantité.
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
 * « Trop long » dit que c'est la limite de l'essai, pas du produit (quatre fois
 * plus avec un compte) : sinon le visiteur croit que Kairn refuse les textes longs.
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
