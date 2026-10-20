import sharp from "sharp";
import { BORD_LONG_CAPTURE, TAILLE_MAXIMALE_OCTETS } from "@/lib/depots/bornes-du-depot";

/**
 * Le type se décide au décodeur, jamais à l'extension ni au type annoncé, qui se
 * falsifient. La réduction double celle du navigateur : un partage du système
 * n'en a pas vu.
 */

const FORMATS_LISIBLES = new Set(["jpeg", "png", "webp", "gif"]);

/**
 * 4 Mo de PNG peuvent annoncer 16 384² pixels, un gigaoctet décodé. Une capture
 * de téléphone fait moins de 4 millions : 50 laisse passer toute photo sous 4 Mo.
 */
const PIXELS_MAXIMUM = 50_000_000;

export type CaptureLue = { donnees: Uint8Array<ArrayBuffer>; mediaType: "image/webp" };

/** Un code, pas une phrase : l'appelant la dit dans la langue de la personne. */
export type RefusDeCapture = "lourde" | "illisible";

export type LectureCapture =
  { ok: true; capture: CaptureLue } | { ok: false; refus: RefusDeCapture };

export async function preparerCapture(fichier: File): Promise<LectureCapture> {
  if (fichier.size > TAILLE_MAXIMALE_OCTETS) {
    return { ok: false, refus: "lourde" };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  // L'en-tête seul, sans limite de pixels : sharp échouerait, et une image trop
  // grande serait dite illisible au lieu de lourde.
  const entete = await sharp(octets)
    .metadata()
    .catch(() => undefined);

  if (!entete?.format || !FORMATS_LISIBLES.has(entete.format)) {
    return { ok: false, refus: "illisible" };
  }

  if ((entete.width ?? 0) * (entete.height ?? 0) > PIXELS_MAXIMUM) {
    return { ok: false, refus: "lourde" };
  }

  const reduite = await sharp(octets, { animated: false, limitInputPixels: PIXELS_MAXIMUM })
    .rotate()
    .resize({
      width: BORD_LONG_CAPTURE,
      height: BORD_LONG_CAPTURE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  return { ok: true, capture: { donnees: new Uint8Array(reduite), mediaType: "image/webp" } };
}
