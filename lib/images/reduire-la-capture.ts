import { BORD_LONG_CAPTURE } from "@/lib/depots/bornes-du-depot";
import { dimensionsReduites } from "@/lib/domain/reduction-de-capture";

/**
 * La capture, réduite dans le navigateur avant de partir.
 *
 * Une action de serveur Next refuse par défaut un corps de plus d'un mégaoctet,
 * l'hébergeur tout corps au-delà de 4,5 Mo, et une capture de téléphone en pèse
 * deux ou trois : le plafond de `next.config.ts` est un garde-fou, pas une
 * solution.
 *
 * Elle réduit à la mesure que `preparerCapture` applique déjà côté serveur,
 * qui reste seul juge (type lu au contenu, seconde réduction) : ce module ne
 * fait qu'épargner les octets du voyage.
 *
 * Elle rend l'original dès que quelque chose ne va pas (décodeur, canevas,
 * rendu plus lourd) : la borne de poids rattrape le reste. Ce module améliore
 * un envoi, il n'a jamais le droit de l'empêcher.
 */

/** En deçà, réencoder ne ferait que dégrader le texte que la lecture doit reconnaître. */
const POIDS_SANS_RETOUCHE = 900 * 1024;

/** Haut, parce que le serveur repassera derrière à 82 : deux passes se cumulent. */
const QUALITE = 0.92;

function dessinable(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function decoder(fichier: File): Promise<ImageBitmap> {
  try {
    // L'orientation EXIF s'applique ici ou jamais : le réencodage perd les
    // métadonnées, et le `.rotate()` du serveur n'aurait plus rien à lire.
    return await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    // Certains navigateurs refusent l'option sans refuser l'image ; une capture
    // d'écran n'a de toute façon pas d'orientation à appliquer.
    return createImageBitmap(fichier);
  }
}

function encoder(toile: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resoudre) => toile.toBlob(resoudre, type, QUALITE));
}

/**
 * Le nom que portait le fichier, avec l'extension de ce qu'il est devenu.
 *
 * L'écran montre ce nom à côté du bouton « changer la capture » : c'est à lui
 * qu'on reconnaît ce qu'on vient de joindre.
 */
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

    // JPEG en repli explicite : un navigateur qui ne sait pas encoder le WebP
    // rend `null`, et son défaut serait un PNG de plusieurs mégaoctets.
    const rendu = (await encoder(toile, "image/webp")) ?? (await encoder(toile, "image/jpeg"));

    if (!rendu || rendu.size >= fichier.size) return fichier;

    return new File([rendu], renommer(fichier.name, rendu.type), { type: rendu.type });
  } catch (erreur) {
    // Le poids et le type, jamais le nom ni le contenu : pas de contenu
    // utilisateur dans les journaux.
    console.warn(
      `[kairn] capture non réduite (${fichier.size} octets, ${fichier.type || "type inconnu"})`,
      erreur,
    );

    return fichier;
  } finally {
    image?.close();
  }
}
