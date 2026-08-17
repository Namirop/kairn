import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { PIERRES_DENSE, PIERRES_REDUITE } from "@/lib/design/marque";
import { symboleSeul, symboleSurPastille } from "@/lib/design/symbole-svg";

/**
 * Produit les fichiers de marque qui ne suivent aucun jeton.
 *
 * `npm run assets`. À relancer quand la géométrie des pierres change, ou quand la
 * graine du logo change — c'est-à-dire jamais, mais la commande existe pour que
 * personne n'ait à rouvrir un outil de dessin.
 *
 * **Rien n'est dessiné à la main.** Tout sort d'`empiler()`, en passant par
 * `symbole-svg`. C'est la seule construction qui garantisse que la favicon, la
 * pastille d'application et le cairn du tableau de bord ne divergent pas.
 *
 * Les chemins écrits existent déjà et sont référencés par `app/manifest.ts` : on
 * remplace leur contenu, pas leurs chemins.
 */

/**
 * La part du côté qu'occupe le symbole sur une pastille ordinaire.
 *
 * Une icône qui touche ses bords se fait rogner par le masque de la plateforme,
 * et paraît trop grosse à côté des autres dans une grille d'applications.
 */
const PART_ORDINAIRE = 0.62;

/**
 * La part d'une icône masquable.
 *
 * La spécification réserve vingt pour cent de marge de sécurité tout autour :
 * seul le disque central est garanti visible, le reste peut être rogné en losange,
 * en goutte ou en cercle selon le lanceur.
 */
const PART_MASQUABLE = 0.46;

/** Les coins de la pastille. Nul là où la plateforme masque déjà elle-même. */
const RAYON_PASTILLE = 0.22;
const SANS_RAYON = 0;

type Fichier = { chemin: string; svg: string; cote: number };

const FICHIERS: Fichier[] = [
  {
    // La favicon. Fond transparent : elle se pose sur la barre d'onglets, dont la
    // teinte appartient au navigateur et pas à nous.
    chemin: "app/icon.png",
    cote: 32,
    svg: symboleSeul({ pierres: PIERRES_REDUITE, hauteurPx: 32 }),
  },
  {
    // iOS applique son propre masque : la pastille est donc à fond perdu et sans
    // rayon, sinon on arrondit deux fois et il reste quatre coins vides.
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
