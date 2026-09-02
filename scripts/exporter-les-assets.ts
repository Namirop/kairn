import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { PIERRES_DENSE, PIERRES_REDUITE } from "@/lib/design/marque";
import { symboleSeul, symboleSurPastille } from "@/lib/design/symbole-svg";

/**
 * Produit les fichiers de marque qui ne suivent aucun jeton.
 *
 * `npm run exporter:assets`. À relancer quand la géométrie des pierres change, ou quand la
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
 * La part de la hauteur qu'occupe le symbole sur une pastille ordinaire.
 *
 * En hauteur et non en largeur : l'empilement est plus haut que large, c'est donc
 * sa hauteur qui décide. Une icône qui touche ses bords se fait rogner par le
 * masque de la plateforme et paraît trop grosse dans une grille d'applications ;
 * une icône trop petite ressemble à un espace réservé.
 */
const PART_ORDINAIRE = 0.72;

/**
 * La part d'une icône masquable.
 *
 * La spécification ne garantit que le **disque central**, de quatre-vingts pour
 * cent du côté : le reste peut être rogné en losange, en goutte ou en cercle selon
 * le lanceur. Un empilement de rapport 0,78 tient dans ce disque jusqu'à
 * soixante-trois pour cent de la hauteur — sa diagonale est ce qui limite, pas sa
 * hauteur seule. On s'arrête un peu en dessous.
 */
const PART_MASQUABLE = 0.58;

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
