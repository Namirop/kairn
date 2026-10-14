import "dotenv/config";
import { jetonsDeLaFeuille } from "./cases/jetons-de-la-feuille";
import { conclure, noter } from "./cases/journal";

/**
 * Les contrastes, mesurés plutôt que regardés : ratios WCAG, lus dans
 * `app/styles/tokens/`, des combinaisons que le produit pose réellement. Deux
 * gris passables sur un écran calibré deviennent illisibles au soleil.
 *
 * Piège de nommage : la surface « ombre » est claire, seule « roche » est
 * sombre.
 *
 *   npm run verifier:contrastes
 */

const AA_TEXTE = 4.5;
/** Un texte large — 18 pt, ou 14 pt gras — se contente de trois pour un. */
const AA_LARGE = 3;

function canal(valeur: number): number {
  const c = valeur / 255;

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);

  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(texte: string, fond: string): number {
  const [clair, sombre] = [luminance(texte), luminance(fond)].sort((a, b) => b - a);

  return ((clair ?? 0) + 0.05) / ((sombre ?? 0) + 0.05);
}

type Combinaison = { texte: string; fond: string; role: string; seuil: number };

/**
 * Ce que le produit pose, surface par surface. La roche, seule surface sombre,
 * porte ses propres variantes éclaircies : un accent réglé pour du clair ne
 * tient pas sur du sombre.
 */
const COMBINAISONS: Combinaison[] = [
  { texte: "stone-900", fond: "surface-papier", role: "encre sur papier", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-papier", role: "texte second sur papier", seuil: AA_TEXTE },
  { texte: "stone-900", fond: "surface-ombre", role: "encre sur ombre", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-ombre", role: "texte second sur ombre", seuil: AA_TEXTE },
  // Sur le sol de la session, le texte second (tags, consigne de réponse) est
  // en `stone-700` : le `stone-500` du papier y passe sous le seuil.
  {
    texte: "stone-900",
    fond: "surface-session",
    role: "encre sur le sol de session",
    seuil: AA_TEXTE,
  },
  {
    texte: "stone-700",
    fond: "surface-session",
    role: "texte second sur le sol de session",
    seuil: AA_TEXTE,
  },
  { texte: "stone-900", fond: "surface-givre", role: "encre sur givre", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-givre", role: "texte second sur givre", seuil: AA_TEXTE },
  { texte: "stone-50", fond: "surface-roche", role: "encre sur roche", seuil: AA_TEXTE },
  { texte: "stone-300", fond: "surface-roche", role: "texte second sur roche", seuil: AA_TEXTE },
  { texte: "stone-400", fond: "surface-roche", role: "niveau et XP sur roche", seuil: AA_TEXTE },
  { texte: "ember-clair", fond: "surface-roche", role: "série sur roche", seuil: AA_TEXTE },
  { texte: "alerte", fond: "surface-papier", role: "erreur sur papier", seuil: AA_TEXTE },
  { texte: "alerte", fond: "surface-ombre", role: "erreur sur ombre", seuil: AA_TEXTE },
  // L'aplat d'alerte porte son propre texte : badge, bouton destructif, énoncé
  // d'une configuration refusée.
  { texte: "alerte", fond: "alerte-surface", role: "erreur sur aplat d'alerte", seuil: AA_TEXTE },
  { texte: "stone-800", fond: "alerte-surface", role: "texte sur aplat d'alerte", seuil: AA_TEXTE },
  { texte: "accent", fond: "surface-papier", role: "accent sur papier", seuil: AA_LARGE },
  // La maîtrise se pose sur du clair (le mot qui comble un trou, la bonne
  // réponse) : c'est `lichen-deep` qui la porte, le lichen saturé y tombant
  // sous le seuil.
  { texte: "lichen-deep", fond: "surface-papier", role: "maîtrise sur papier", seuil: AA_LARGE },
  { texte: "ember", fond: "surface-papier", role: "série sur papier", seuil: AA_LARGE },
  // La dalle d'un concept posée sur la roche, dans la fenêtre de l'essai : elle
  // est en `stone-700`, `stone-800` étant trop proche de la roche pour s'en
  // détacher.
  { texte: "stone-50", fond: "stone-700", role: "encre sur dalle de roche", seuil: AA_TEXTE },
  { texte: "stone-300", fond: "stone-700", role: "texte second sur dalle", seuil: AA_TEXTE },
  // L'anneau de focus doit se voir sur ce qu'il entoure, d'où une variante par
  // surface.
  { texte: "accent-clair", fond: "surface-roche", role: "focus sur roche", seuil: AA_LARGE },
  { texte: "accent-profond", fond: "surface-papier", role: "focus sur papier", seuil: AA_LARGE },
  // L'invite du champ de dépôt, sur le creux qui le dessine. `stone-400` n'y
  // donne que 1,7, et c'est la seule phrase qui dise quoi mettre dans le champ.
  {
    texte: "stone-500",
    fond: "surface-ombre",
    role: "invite du champ sur le creux",
    seuil: AA_TEXTE,
  },
  // Le trait sous le champ : un indicateur de focus doit se distinguer de son
  // état de repos, pas seulement du fond.
  {
    texte: "accent-profond",
    fond: "stone-300",
    role: "focus du champ contre son repos",
    seuil: AA_LARGE,
  },
];

function main(): void {
  const jetons = jetonsDeLaFeuille();

  for (const combinaison of COMBINAISONS) {
    const texte = jetons[combinaison.texte];
    const fond = jetons[combinaison.fond];

    if (!texte || !fond) {
      noter(`Contraste — ${combinaison.role}`, false, "jeton introuvable dans app/styles/tokens/");
      continue;
    }

    const ratio = contraste(texte, fond);

    noter(
      `Contraste — ${combinaison.role}`,
      ratio >= combinaison.seuil,
      `${ratio.toFixed(2)} pour 1 (seuil ${combinaison.seuil})`,
    );
  }
}

main();
conclure("Contrastes conformes sur toutes les surfaces.");
