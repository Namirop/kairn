import { BORD_LONG_CAPTURE } from "@/lib/depots/bornes-du-depot";
import { dimensionsReduites } from "@/lib/domain/reduction-de-capture";

/**
 * Réduite dans le navigateur avant de partir : une Server Action refuse 1 Mo
 * par défaut, Vercel 4,5 Mo, et une capture de téléphone en pèse deux ou trois.
 * Même mesure que `preparerCapture`, qui reste seul juge ; ici on n'épargne que
 * le voyage. Au moindre accroc, l'original part : ce module améliore un envoi,
 * il n'a jamais le droit de l'empêcher.
 */

/** En deçà, réencoder ne ferait que dégrader le texte à lire. */
const POIDS_SANS_RETOUCHE = 900 * 1024;

/** Haut : le serveur repasse à 82, et deux passes se cumulent. */
const QUALITE = 0.92;

function dessinable(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function decoder(fichier: File): Promise<ImageBitmap> {
  try {
    // Ici ou jamais : le réencodage perd l'EXIF que lirait le `.rotate()` du serveur.
    return await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    // Certains navigateurs refusent l'option, pas l'image.
    return createImageBitmap(fichier);
  }
}

function encoder(toile: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resoudre) => toile.toBlob(resoudre, type, QUALITE));
}

/** Le nom d'origine reste : l'écran l'affiche pour reconnaître ce qu'on a joint. */
function renommer(nom: string, type: string): string {
  const extension = type === "image/webp" ? "webp" : "jpg";
  const base = nom.replace(/\.[^.]*$/, "").trim();

  return `${base || "capture"}.${extension}`;
}

export async function reduireLaCapture(fichier: File): Promise<File> {
  if (fichier.size <= POIDS_SANS_RETOUCHE || !dessinable()) return fichier;

  let image: ImageBitmap | null = null;

  try {
    image = await decoder(fichier);

    const mesure = dimensionsReduites(
      { largeur: image.width, hauteur: image.height },
      BORD_LONG_CAPTURE,
    );
    const toile = document.createElement("canvas");

    toile.width = mesure.largeur;
    toile.height = mesure.hauteur;

    const pinceau = toile.getContext("2d");

    if (!pinceau) return fichier;

    pinceau.drawImage(image, 0, 0, mesure.largeur, mesure.hauteur);

    // Sans WebP, `toBlob` rend `null` ; son défaut serait un PNG de plusieurs Mo.
    const rendu = (await encoder(toile, "image/webp")) ?? (await encoder(toile, "image/jpeg"));

    if (!rendu || rendu.size >= fichier.size) return fichier;

    return new File([rendu], renommer(fichier.name, rendu.type), { type: rendu.type });
  } catch (erreur) {
    // Jamais le nom : pas de contenu utilisateur dans les journaux.
    console.warn(
      `[kairn] capture non réduite (${fichier.size} octets, ${fichier.type || "type inconnu"})`,
      erreur,
    );

    return fichier;
  } finally {
    image?.close();
  }
}
