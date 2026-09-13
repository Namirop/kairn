import { BORD_LONG_CAPTURE } from "@/lib/depots/bornes-du-depot";
import { dimensionsReduites } from "@/lib/domain/reduction-de-capture";

/**
 * La capture, réduite dans le navigateur avant de partir.
 *
 * **Elle existe parce que le dépôt par capture ne marchait pas depuis un
 * téléphone.** Une action de serveur Next refuse un corps de plus d'un
 * mégaoctet, et une capture d'écran de téléphone en pèse deux ou trois quand
 * celle d'un ordinateur en pèse quatre cents kilo. Le plafond a été relevé dans
 * `next.config.ts`, mais c'est un garde-fou et non une solution : au-dessus de
 * quatre mégaoctets et demi, c'est l'hébergeur qui refuse, et de toute façon
 * personne ne veut téléverser trois mégaoctets en 4G pour déposer une phrase.
 *
 * **Elle réduit à la mesure que le serveur applique déjà.** `preparerCapture`
 * ramène le bord long à la même valeur : ce qu'on fait ici, c'est le faire
 * avant le transport plutôt qu'après. Le serveur reste seul juge — il décide du
 * type par le contenu et refait sa propre réduction —, ce module ne fait que
 * lui épargner les octets du voyage.
 *
 * **Elle ne touche pas aux petites captures.** En deçà du seuil, réencoder
 * coûterait un tour de compression sur une image qui passait très bien, et le
 * texte d'une capture d'écran est ce qu'il y a de plus sensible à ça — c'est
 * exactement ce que la lecture doit reconnaître.
 *
 * **Elle rend l'original dès que quelque chose ne va pas.** Un décodeur qui
 * refuse le fichier, un canevas indisponible, un rendu plus lourd que la
 * source : dans tous ces cas le dépôt part comme avant, et la borne de poids le
 * rattrape s'il est vraiment trop gros. Ce module améliore un envoi, il n'a
 * jamais le droit de l'empêcher.
 */

/** En deçà, l'envoi ne pose aucun problème et réencoder ne ferait que dégrader. */
const POIDS_SANS_RETOUCHE = 900 * 1024;

/** Haut, parce que le serveur repassera derrière à 82 : deux passes se cumulent. */
const QUALITE = 0.92;

function dessinable(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function decoder(fichier: File): Promise<ImageBitmap> {
  try {
    // L'orientation EXIF est appliquée au décodage, et c'est le seul moment
    // possible : le réencodage qui suit ne transporte aucune métadonnée, donc
    // le `.rotate()` du serveur n'aurait plus rien à lire. Sans ça, une photo
    // prise en tenant le téléphone de travers arriverait couchée.
    return await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    // Certains navigateurs refusent l'option sans refuser l'image. On décode
    // alors sans elle : une capture d'écran n'a pas d'orientation à appliquer,
    // et c'est le cas que ce module sert en premier.
    return createImageBitmap(fichier);
  }
}

function encoder(toile: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resoudre) => toile.toBlob(resoudre, type, QUALITE));
}

/**
 * Le nom que portait le fichier, avec l'extension de ce qu'il est devenu.
 *
 * L'écran montre ce nom à côté du bouton « changer la capture », et c'est à ça
 * qu'on reconnaît ce qu'on vient de joindre. Le remplacer par « capture.webp »
 * reviendrait à renommer le choix de quelqu'un derrière son dos.
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

    // WebP d'abord, JPEG en repli : un navigateur qui ne sait pas encoder le
    // premier rend `null` sans lever, et rendrait alors un PNG de plusieurs
    // mégaoctets si on le laissait retomber sur son défaut.
    const rendu = (await encoder(toile, "image/webp")) ?? (await encoder(toile, "image/jpeg"));

    if (!rendu || rendu.size >= fichier.size) return fichier;

    return new File([rendu], renommer(fichier.name, rendu.type), { type: rendu.type });
  } catch (erreur) {
    // Le poids et le type, jamais le nom ni le contenu : ce sont les deux
    // seules choses qui expliquent un échec de décodage, et les seules qu'on
    // ait le droit d'écrire dans un journal.
    console.warn(
      `[kairn] capture non réduite (${fichier.size} octets, ${fichier.type || "type inconnu"})`,
      erreur,
    );

    return fichier;
  } finally {
    image?.close();
  }
}
