import { createHash } from "node:crypto";
import { z } from "zod";
import { lireLeCache, ecrireAuCache } from "./cache-de-vecteurs";
import { MODELE_EMBEDDING, type Vecteur } from "./espace";

/**
 * La passe de vecteurs du banc, chez Voyage : le seul appel du projet à ce
 * fournisseur. Hors production : clé propre au banc, hors `callAI()` et hors
 * des plafonds de `reservation.ts`. Le modèle (`MODELE_EMBEDDING`) indexe le
 * cache : en changer invalide les vecteurs comme les seuils.
 *
 * Aucun `input_type` n'est envoyé : `query` et `document` rendent l'espace
 * asymétrique, alors qu'ici toutes les comparaisons sont symétriques (phrase
 * contre concept, concept contre concept).
 */

const URL_VOYAGE = "https://api.voyageai.com/v1/embeddings";

/**
 * Calés sur le palier gratuit de Voyage, sans moyen de paiement : trois requêtes
 * et dix mille tokens par minute. Vingt-quatre segments pèsent ~3 000 tokens,
 * et 21 s d'attente tiennent sous les trois requêtes. L'attente est préventive :
 * un 429 arrête la passe, il n'est jamais réémis. À relever si un moyen de
 * paiement est posé.
 */
const PAR_REQUETE = 24;
const ATTENTE_MS = 21_000;

function attendre(millisecondes: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, millisecondes));
}

const reponseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
  usage: z.object({ total_tokens: z.number() }).optional(),
});

/** L'empreinte qui indexe le cache : le modèle en fait partie, pas seulement le texte. */
export function empreinte(texte: string): string {
  return createHash("sha256").update(`${MODELE_EMBEDDING}\n${texte}`).digest("hex");
}

function cle(): string {
  const cle = process.env.VOYAGE_IA_KEY?.trim();

  if (!cle) {
    throw new Error(
      "VOYAGE_IA_KEY absente de l'environnement : la passe de vecteurs ne peut pas démarrer.",
    );
  }

  return cle;
}

async function appeler(textes: string[]): Promise<{ vecteurs: Vecteur[]; tokens: number }> {
  const reponse = await fetch(URL_VOYAGE, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cle()}` },
    body: JSON.stringify({ input: textes, model: MODELE_EMBEDDING }),
  });

  if (!reponse.ok) {
    // Pas de reprise : l'échec arrête la passe, le cache garde ce qui précède.
    throw new Error(
      `Voyage a refusé la requête (${reponse.status}) : ${(await reponse.text()).slice(0, 400)}`,
    );
  }

  const lu = reponseSchema.parse(await reponse.json());

  if (lu.data.length !== textes.length) {
    throw new Error(`Voyage a rendu ${lu.data.length} vecteurs pour ${textes.length} textes.`);
  }

  // L'ordre n'est pas garanti par le contrat : on le rétablit par `index`.
  const ordonnes: Vecteur[] = Array.from({ length: textes.length });

  for (const entree of lu.data) ordonnes[entree.index] = entree.embedding;

  return { vecteurs: ordonnes, tokens: lu.usage?.total_tokens ?? 0 };
}

export type Passe = {
  /** Le vecteur d'un texte déjà plongé. Lève si le texte n'a pas été demandé. */
  vecteur: (texte: string) => Vecteur;
  /** Dimension de l'espace, relevée sur les vecteurs reçus. Écrite au rapport. */
  dimension: number;
  /** Textes calculés par l'API sur cette passe — le reste venait du cache. */
  calcules: number;
  /** Textes servis par le cache, donc gratuits. */
  enCache: number;
  /** Tokens facturés par le fournisseur sur cette passe. Zéro si tout était en cache. */
  tokens: number;
};

/**
 * Plonge une liste de textes et rend de quoi les relire. Un même texte n'est
 * plongé qu'une fois (même empreinte), ce qui est fréquent sur un rejeu.
 */
export async function plonger(textes: string[]): Promise<Passe> {
  const cache = lireLeCache();
  const parEmpreinte = new Map<string, Vecteur>();
  const aCalculer: string[] = [];

  // Voyage refuse les chaînes vides, et un figé peut porter une `question`
  // vide : vecteur vide, propagé en NaN par `cosinus`, plutôt qu'une mesure
  // qui tombe.
  parEmpreinte.set(empreinte(""), []);

  for (const texte of new Set(textes)) {
    if (texte === "") continue;

    const trace = empreinte(texte);
    const connu = cache.get(trace);

    if (connu) parEmpreinte.set(trace, connu);
    else aCalculer.push(texte);
  }

  let tokens = 0;

  for (let debut = 0; debut < aCalculer.length; debut += PAR_REQUETE) {
    if (debut > 0) await attendre(ATTENTE_MS);

    const lot = aCalculer.slice(debut, debut + PAR_REQUETE);
    const rendu = await appeler(lot);
    const neufs = new Map<string, Vecteur>();

    tokens += rendu.tokens;

    lot.forEach((texte, rang) => {
      const vecteur = rendu.vecteurs[rang];

      if (!vecteur) throw new Error(`Vecteur manquant pour le texte ${debut + rang}.`);

      const trace = empreinte(texte);
      neufs.set(trace, vecteur);
      parEmpreinte.set(trace, vecteur);
    });

    // Écrit lot par lot : une passe interrompue (refus, Ctrl-C) garde tout ce
    // qu'elle a déjà payé.
    ecrireAuCache(neufs);

    const faits = Math.min(debut + PAR_REQUETE, aCalculer.length);
    console.info(`  vecteurs : ${faits}/${aCalculer.length}`);
  }

  return {
    vecteur: (texte) => {
      const trouve = parEmpreinte.get(empreinte(texte));

      if (!trouve) {
        throw new Error(`Texte jamais plongé dans cette passe : « ${texte.slice(0, 60)}… »`);
      }

      return trouve;
    },
    // Le vecteur vide de la chaîne vide n'est ni une dimension ni un texte servi.
    dimension: [...parEmpreinte.values()].find((v) => v.length > 0)?.length ?? 0,
    calcules: aCalculer.length,
    enCache: parEmpreinte.size - 1 - aCalculer.length,
    tokens,
  };
}
