import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MODELE_EMBEDDING, type Vecteur } from "./espace";

/**
 * Le cache de vecteurs sur disque. Les vecteurs sont déterministes : les garder
 * rend la calibration (seuils, ablation, comparaison de figés) gratuite.
 *
 * Un fichier JSONL par modèle, en ajout seul : une passe interrompue garde ce
 * qu'elle a calculé. Les doublons sont sans conséquence, ils portent le même
 * vecteur.
 *
 * Float32 en base64 plutôt qu'un tableau JSON : environ deux fois plus léger.
 *
 * Le dossier n'est pas suivi par git : le rebâtir coûte une fraction de centime.
 * Les figés, eux, sont la référence et restent suivis.
 */

const DOSSIER = join(import.meta.dirname, "..", "vecteurs");

function chemin(): string {
  return join(DOSSIER, `${MODELE_EMBEDDING}.jsonl`);
}

function encoder(vecteur: Vecteur): string {
  return Buffer.from(new Float32Array(vecteur).buffer).toString("base64");
}

function decoder(encode: string): Vecteur {
  const octets = Buffer.from(encode, "base64");
  const flottants = new Float32Array(
    octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength),
  );

  return Array.from(flottants);
}

/** Ce que le cache connaît déjà, indexé par empreinte. Vide s'il n'existe pas. */
export function lireLeCache(): Map<string, Vecteur> {
  const connus = new Map<string, Vecteur>();
  const fichier = chemin();

  if (!existsSync(fichier)) return connus;

  for (const ligne of readFileSync(fichier, "utf8").split("\n")) {
    if (!ligne.trim()) continue;

    try {
      const lu: unknown = JSON.parse(ligne);

      if (
        typeof lu === "object" &&
        lu !== null &&
        "h" in lu &&
        "v" in lu &&
        typeof lu.h === "string" &&
        typeof lu.v === "string"
      ) {
        connus.set(lu.h, decoder(lu.v));
      }
    } catch (erreur) {
      // Une ligne tronquée par une interruption ne condamne pas le fichier :
      // son texte sera recalculé.
      console.warn("Ligne de cache illisible, ignorée :", erreur);
    }
  }

  return connus;
}

export function ecrireAuCache(vecteurs: Map<string, Vecteur>): void {
  if (vecteurs.size === 0) return;

  mkdirSync(DOSSIER, { recursive: true });

  const lignes = [...vecteurs]
    .map(([empreinte, vecteur]) => JSON.stringify({ h: empreinte, v: encoder(vecteur) }))
    .join("\n");

  appendFileSync(chemin(), `${lignes}\n`, "utf8");
}
