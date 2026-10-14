import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { PIERRES_DENSE, PIERRES_REDUITE } from "@/lib/design/marque";
import { symboleSeul, symboleSurPastille } from "@/lib/design/symbole-svg";

/**
 * Produit les fichiers de marque qui ne suivent aucun jeton, à relancer
 * (`npm run exporter:assets`) quand la géométrie des pierres ou la graine du
 * logo change. Tout sort de `symbole-svg`, donc du même empilement que le cairn
 * du tableau de bord : rien n'est dessiné à la main. Les chemins sont référencés
 * par `app/manifest.ts` et ne changent pas.
 */

/**
 * La part de la hauteur (l'empilement est plus haut que large) qu'occupe le
 * symbole sur une pastille ordinaire : assez de marge pour échapper au masque de
 * la plateforme, pas au point de ressembler à un espace réservé.
 */
const PART_ORDINAIRE = 0.72;

/**
 * La part d'une icône masquable. Seul le disque central de 80 % du côté est
 * garanti ; un empilement de rapport 0,78 y tient jusqu'à 63 % de la hauteur
 * (c'est sa diagonale qui limite). On s'arrête un peu en dessous.
 */
const PART_MASQUABLE = 0.58;

/** Les coins de la pastille. Nul là où la plateforme masque déjà elle-même. */
const RAYON_PASTILLE = 0.22;
const SANS_RAYON = 0;

type Fichier = { chemin: string; svg: string; cote: number };

const FICHIERS: Fichier[] = [
  {
    // La favicon, sur fond transparent : la barre d'onglets a la teinte du navigateur.
    chemin: "app/icon.png",
    cote: 32,
    svg: symboleSeul({ pierres: PIERRES_REDUITE, hauteurPx: 32 }),
  },
  {
    // Sans rayon : iOS applique son propre masque, et arrondir deux fois laisse
    // quatre coins vides.
    chemin: "public/icones/apple-touch-icon.png",
    cote: 180,
    svg: symboleSurPastille({
      pierres: PIERRES_REDUITE,
      cote: 180,
      part: PART_ORDINAIRE,
      rayon: SANS_RAYON,
    }),
  },
  {
    chemin: "public/icones/icone-192.png",
    cote: 192,
    svg: symboleSurPastille({
      pierres: PIERRES_DENSE,
      cote: 192,
      part: PART_ORDINAIRE,
      rayon: RAYON_PASTILLE,
    }),
  },
  {
    chemin: "public/icones/icone-512.png",
    cote: 512,
    svg: symboleSurPastille({
      pierres: PIERRES_DENSE,
      cote: 512,
      part: PART_ORDINAIRE,
      rayon: RAYON_PASTILLE,
    }),
  },
  {
    chemin: "public/icones/icone-maskable-512.png",
    cote: 512,
    svg: symboleSurPastille({
      pierres: PIERRES_DENSE,
      cote: 512,
      part: PART_MASQUABLE,
      rayon: SANS_RAYON,
    }),
  },
];

/** Le symbole vectoriel, pour les usages hors application. */
const SYMBOLE_SVG = "public/kairn-symbole.svg";

async function main(): Promise<void> {
  for (const fichier of FICHIERS) {
    const png = await sharp(Buffer.from(fichier.svg), { density: 384 })
      .resize(fichier.cote, fichier.cote, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await writeFile(fichier.chemin, png);
    console.log(`${fichier.chemin} — ${fichier.cote} px, ${(png.length / 1024).toFixed(1)} ko`);
  }

  await writeFile(SYMBOLE_SVG, symboleSeul({ pierres: PIERRES_DENSE, hauteurPx: 512 }), "utf8");
  console.log(`${SYMBOLE_SVG} — vectoriel`);
}

void main();
