import { composerLePartage, type PartageCompose } from "@/lib/domain/texte-partage";

/**
 * Ce qu'un partage du système a laissé pour le formulaire, et comment on le reprend.
 *
 * Quand Android envoie un partage à Kairn, c'est le service worker qui reçoit
 * l'envoi — pas une route. Il range ce qui a été partagé sur l'appareil et
 * renvoie vers le formulaire, qui vient le chercher ici. Le texte ne part au
 * serveur qu'au moment où la personne appuie sur « Déposer », exactement comme
 * un copier-coller : quelqu'un qui partage puis renonce n'a rien envoyé.
 *
 * **Les clés sont recopiées dans `public/sw.js`.** Ce fichier-là est servi tel
 * quel, sans compilation, donc il ne peut rien importer. Les deux côtés doivent
 * bouger ensemble, et c'est la seule raison pour laquelle ces chaînes existent
 * en double dans le projet.
 *
 * Un champ par clé plutôt qu'un objet sérialisé : il n'y a alors rien à
 * analyser au retour, donc rien à valider, donc aucune forme inconnue à
 * traverser pour remplir un champ de texte.
 */

export const CACHE_PARTAGE = "kairn-partage";

export const CLES_DU_PARTAGE = {
  titre: "/partage/titre",
  texte: "/partage/texte",
  lien: "/partage/lien",
  capture: "/partage/capture",
} as const;

/** Le nom du fichier ne survit pas au corps d'une réponse : il voyage à côté. */
export const EN_TETE_DU_NOM = "x-nom-du-fichier";

export type PartageRepris = PartageCompose & { capture: File | null };

/**
 * Le partage en attente, s'il y en a un. Il est effacé en le lisant.
 *
 * Une seule reprise : laissé en place, il reviendrait remplir le champ au dépôt
 * suivant avec ce qu'on avait partagé la semaine d'avant.
 */
export async function reprendreLePartage(): Promise<PartageRepris | null> {
  // Absent d'un contexte non sécurisé, et de tout navigateur qui ne sait pas
  // installer d'application — c'est-à-dire de tous ceux qui ne partagent pas.
  if (typeof caches === "undefined") return null;
  if (!(await caches.has(CACHE_PARTAGE))) return null;

  const cache = await caches.open(CACHE_PARTAGE);
  const [titre, texte, lien, capture] = await Promise.all([
    cache.match(CLES_DU_PARTAGE.titre),
    cache.match(CLES_DU_PARTAGE.texte),
    cache.match(CLES_DU_PARTAGE.lien),
    cache.match(CLES_DU_PARTAGE.capture),
  ]);

  await caches.delete(CACHE_PARTAGE);

  if (!titre && !texte && !lien && !capture) return null;

  const compose = composerLePartage({
    titre: titre ? await titre.text() : null,
    texte: texte ? await texte.text() : null,
    lien: lien ? await lien.text() : null,
  });

  return { ...compose, capture: capture ? await enFichier(capture) : null };
}

async function enFichier(reponse: Response): Promise<File> {
  const octets = await reponse.blob();
  const nom = reponse.headers.get(EN_TETE_DU_NOM);

  return new File([octets], nom ? decodeURIComponent(nom) : "capture", { type: octets.type });
}
