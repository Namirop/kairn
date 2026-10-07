import "dotenv/config";
import { jeuxDeJetons } from "./verification/jetons-de-la-feuille";
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
  // L'aplat d'alerte porte son propre texte : le badge, le bouton destructif et
  // l'énoncé d'une configuration refusée. Il était posé partout sans jamais
  // avoir été mesuré.
  { texte: "alerte", fond: "alerte-surface", role: "erreur sur aplat d'alerte", seuil: AA_TEXTE },
  { texte: "stone-800", fond: "alerte-surface", role: "texte sur aplat d'alerte", seuil: AA_TEXTE },
  { texte: "accent", fond: "surface-papier", role: "accent sur papier", seuil: AA_LARGE },
  // La maîtrise est l'autre métier du lichen, et elle se pose sur du clair :
  // le mot qui comble un trou, la bonne réponse. En production c'est la même
  // couleur que l'accent ; sous une palette, c'est la seule qui reste verte,
  // et rien ne garantissait plus qu'elle s'y voie.
  { texte: "lichen-deep", fond: "surface-papier", role: "maîtrise sur papier", seuil: AA_LARGE },
  { texte: "ember", fond: "surface-papier", role: "série sur papier", seuil: AA_LARGE },
  // La dalle posée sur la roche : celle d'un concept dans la fenêtre de l'essai.
  // `stone-800` y servait de surface d'objet et vaut exactement `surface-roche`
  // — une dalle invisible sur son propre fond. C'est `stone-700` qui porte, et
  // ce sont ses textes qu'il faut mesurer.
  { texte: "stone-50", fond: "stone-700", role: "encre sur dalle de roche", seuil: AA_TEXTE },
  { texte: "stone-300", fond: "stone-700", role: "texte second sur dalle", seuil: AA_TEXTE },
  // L'anneau de focus doit se voir sur ce qu'il entoure. `lichen-deep` est réglé
  // pour le papier ; sur la roche, il fallait mesurer avant d'y poser le seul
  // parcours de conversion du produit.
  { texte: "accent-clair", fond: "surface-roche", role: "focus sur roche", seuil: AA_LARGE },
  { texte: "accent-profond", fond: "surface-papier", role: "focus sur papier", seuil: AA_LARGE },
  // L'invite du champ de dépôt, posée sur le creux qui le dessine. Elle était en
  // `stone-400`, qui n'y donne que 2,09 — et guère mieux sur le papier d'avant.
  // C'est pourtant la seule phrase qui dise quoi mettre dans le champ : le pire
  // endroit du produit où laisser du texte sous le seuil.
  {
    texte: "stone-500",
    fond: "surface-ombre",
    role: "invite du champ sur le creux",
    seuil: AA_TEXTE,
  },
  // Le trait sous le champ, au repos puis au focus. Ce qu'un indicateur de focus
  // doit franchir, ce n'est pas le fond : c'est **l'état d'avant**.
  {
    texte: "accent-profond",
    fond: "stone-300",
    role: "focus du champ contre son repos",
    seuil: AA_LARGE,
  },
];

function main(): void {
  for (const jeu of jeuxDeJetons()) {
    for (const combinaison of COMBINAISONS) {
      const texte = jeu.jetons[combinaison.texte];
      const fond = jeu.jetons[combinaison.fond];
      const role = `${jeu.nom} — ${combinaison.role}`;

      if (!texte || !fond) {
        record(`Contraste — ${role}`, false, "jeton introuvable dans globals.css");
        continue;
      }

      const ratio = contraste(texte, fond);

      record(
        `Contraste — ${role}`,
        ratio >= combinaison.seuil,
        `${ratio.toFixed(2)} pour 1 (seuil ${combinaison.seuil})`,
      );
    }
  }
}

main();
conclure("Contrastes conformes sur toutes les surfaces.");
