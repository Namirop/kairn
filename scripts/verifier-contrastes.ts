import "dotenv/config";
import { readFileSync } from "node:fs";
import { conclure, record } from "./verification/journal";

/**
 * Les contrastes, mesurés plutôt que regardés.
 *
 * « Ça se lit » n'est pas une vérification : deux gris passables à l'œil sur un
 * grand écran calibré deviennent illisibles au soleil, et personne ne s'en
 * aperçoit avant qu'un utilisateur le dise. Ce script lit les jetons dans
 * `globals.css` et calcule les ratios WCAG des combinaisons que le produit pose
 * réellement.
 *
 * Le piège qu'il vient de rattraper : la surface nommée « ombre » est claire,
 * seule « roche » est sombre. Un composant écrit pour l'une et posé sur l'autre
 * y était invisible, et le nom suffisait à s'y tromper.
 *
 *   npm run verify:contrastes
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

/** Les jetons tels que la feuille de style les définit, pas tels qu'on croit. */
function jetons(): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const trouves: Record<string, string> = {};

  for (const [, nom, valeur] of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (nom && valeur) trouves[nom] = valeur;
  }

  return trouves;
}

type Combinaison = { texte: string; fond: string; role: string; seuil: number };

/**
 * Ce que le produit pose vraiment, surface par surface.
 *
 * Les surfaces claires portent l'encre et le texte second du papier ; la roche,
 * seule surface sombre, porte les siens — dont un gris et un ember éclaircis,
 * parce qu'un accent réglé pour du clair ne tient pas sur du sombre.
 */
const COMBINAISONS: Combinaison[] = [
  { texte: "stone-900", fond: "surface-papier", role: "encre sur papier", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-papier", role: "texte second sur papier", seuil: AA_TEXTE },
  { texte: "stone-900", fond: "surface-ombre", role: "encre sur ombre", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-ombre", role: "texte second sur ombre", seuil: AA_TEXTE },
  { texte: "stone-900", fond: "surface-lichen", role: "encre sur lichen", seuil: AA_TEXTE },
  { texte: "stone-500", fond: "surface-lichen", role: "texte second sur lichen", seuil: AA_TEXTE },
  { texte: "stone-50", fond: "surface-roche", role: "encre sur roche", seuil: AA_TEXTE },
  { texte: "stone-300", fond: "surface-roche", role: "texte second sur roche", seuil: AA_TEXTE },
  { texte: "stone-400", fond: "surface-roche", role: "niveau et XP sur roche", seuil: AA_TEXTE },
  { texte: "ember-clair", fond: "surface-roche", role: "série sur roche", seuil: AA_TEXTE },
  { texte: "alerte", fond: "surface-papier", role: "erreur sur papier", seuil: AA_TEXTE },
  { texte: "alerte", fond: "surface-ombre", role: "erreur sur ombre", seuil: AA_TEXTE },
  { texte: "lichen", fond: "surface-papier", role: "accent sur papier", seuil: AA_LARGE },
  { texte: "ember", fond: "surface-papier", role: "série sur papier", seuil: AA_LARGE },
];

function main(): void {
  const palette = jetons();

  for (const combinaison of COMBINAISONS) {
    const texte = palette[combinaison.texte];
    const fond = palette[combinaison.fond];

    if (!texte || !fond) {
      record(`Contraste — ${combinaison.role}`, false, "jeton introuvable dans globals.css");
      continue;
    }

    const ratio = contraste(texte, fond);

    record(
      `Contraste — ${combinaison.role}`,
      ratio >= combinaison.seuil,
      `${ratio.toFixed(2)} pour 1 (seuil ${combinaison.seuil})`,
    );
  }
}

main();
conclure("Contrastes conformes sur toutes les surfaces.");
