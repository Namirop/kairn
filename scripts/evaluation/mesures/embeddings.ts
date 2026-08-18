import { createHash } from "node:crypto";
import { z } from "zod";
import { lireLeCache, ecrireAuCache } from "./cache-de-vecteurs";
import { MODELE_EMBEDDING, type Vecteur } from "./espace";

/**
 * La passe de vecteurs du banc.
 *
 * Anthropic ne fait pas d'embeddings : cette mesure passe donc par un
 * fournisseur dédié, et c'est le seul endroit du projet qui l'appelle. Rien de
 * ceci n'entre en production — la clé est propre au banc, les appels ne passent
 * pas par `callAI()` et ne comptent dans aucun plafond de `reservation.ts`.
 *
 * **Le nom du modèle est une constante, et il est écrit dans chaque rapport.**
 * Deux modèles produisent des espaces incompatibles : un plancher calibré sur
 * l'un ne veut rien dire sur l'autre. Changer cette ligne invalide tous les
 * seuils, et c'est voulu que ça se voie.
 *
 * Aucun `input_type` n'est envoyé. Voyage en propose deux, `query` et
 * `document`, qui déforment l'espace pour la recherche — on y gagne quand on
 * cherche un document à partir d'une question. Ici toutes les comparaisons sont
 * symétriques : une phrase contre un concept, un concept contre un concept. Un
 * espace asymétrique fausserait les distances dans les deux sens.
 */

const URL_VOYAGE = "https://api.voyageai.com/v1/embeddings";

/**
 * Textes par requête, et attente entre deux requêtes.
 *
 * Ces deux valeurs sont calées sur le **palier gratuit** de Voyage : trois
 * requêtes et dix mille tokens par minute tant qu'aucun moyen de paiement n'est
 * enregistré. Un lot de vingt-quatre segments pèse autour de trois mille tokens,
 * et vingt et une secondes d'attente tiennent sous les trois requêtes.
 *
 * L'attente est **préventive**, jamais une reprise après échec : on ne réémet
 * pas une requête refusée, on s'arrange pour ne pas la faire refuser. Un 429
 * qui passerait quand même arrête la passe, et le cache garde ce qui précède.
 *
 * Un corpus entier à froid prend donc quelques minutes, une seule fois. La
 * deuxième passe ne rappelle rien. Ces bornes se relèvent le jour où un moyen
 * de paiement est posé sur le compte — les tokens offerts, eux, ne changent pas.
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
    // Pas de reprise automatique : un échec est un échec, il est dit et il
    // arrête la passe. Le cache garde ce qui était déjà calculé.
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
 * Plonge une liste de textes et rend de quoi les relire.
 *
 * Les doublons ne sont plongés qu'une fois — le même texte a la même empreinte,
 * donc la même entrée de cache. C'est fréquent : deux dépôts peuvent partager
 * une phrase, et un rejeu repose exactement les mêmes questions.
 */
export async function plonger(textes: string[]): Promise<Passe> {
  const cache = lireLeCache();
  const parEmpreinte = new Map<string, Vecteur>();
  const aCalculer: string[] = [];

  for (const texte of new Set(textes)) {
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

    // Écrit lot par lot, et non à la fin. Une passe interrompue au milieu — un
    // refus du fournisseur, un Ctrl-C — doit laisser derrière elle tout ce
    // qu'elle avait déjà payé. Écrire à la fin l'a fait perdre une fois.
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
    dimension: [...parEmpreinte.values()][0]?.length ?? 0,
    calcules: aCalculer.length,
    enCache: parEmpreinte.size - aCalculer.length,
    tokens,
  };
}
