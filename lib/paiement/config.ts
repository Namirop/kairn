import { z } from "zod";
import { PaiementConfigError, PaiementLiveNonAutoriseError } from "./erreurs";

/**
 * Les deux secrets du paiement, lus et validés à chaque usage plutôt qu'au
 * chargement du module — même convention que les garde-fous du modèle : couper
 * le paiement chez l'hébergeur doit prendre effet sans redémarrage.
 *
 * **Le mode test est le défaut, et il l'est par construction.** Une clé de
 * production est refusée tant que `PAIEMENT_LIVE` ne vaut pas `true`. C'est
 * l'équivalent de `MOCK_AI` pour l'argent : le geste dangereux demande d'être
 * énoncé, il ne s'obtient pas en collant la mauvaise ligne dans la mauvaise
 * colonne d'une interface d'hébergeur.
 */

const schema = z.object({
  cleSecrete: z.string().min(1),
  secretDuWebhook: z.string().min(1),
  live: z
    .enum(["true", "false"])
    .default("false")
    .transform((valeur) => valeur === "true"),
});

export type ConfigDePaiement = z.infer<typeof schema>;

/** La variable derrière chaque champ. Sans elle, l'erreur ne dit pas quoi corriger. */
const VARIABLE: Record<string, string> = {
  cleSecrete: "STRIPE_SECRET_KEY",
  secretDuWebhook: "STRIPE_WEBHOOK_SECRET",
  live: "PAIEMENT_LIVE",
};

/**
 * Ce qui distingue une clé de production d'une clé de test.
 *
 * Stripe préfixe les deux, et c'est le seul signe disponible sans appeler
 * l'API — on ne va pas faire un aller-retour réseau pour savoir si l'on a le
 * droit de parler.
 */
const CLE_DE_PRODUCTION = /^(sk|rk)_live_/;

/**
 * La configuration, ou une erreur qui nomme la variable fautive.
 *
 * Lève plutôt que de rendre un état dégradé : un paiement à moitié configuré
 * n'a aucun comportement acceptable, et le seul endroit où l'absence de
 * configuration est une réponse valable est l'écran, qui demande
 * `paiementOuvert()`.
 */
export function lireConfigDePaiement(): ConfigDePaiement {
  const lu = schema.safeParse({
    cleSecrete: process.env.STRIPE_SECRET_KEY,
    secretDuWebhook: process.env.STRIPE_WEBHOOK_SECRET,
    live: process.env.PAIEMENT_LIVE,
  });

  if (!lu.success) {
    const probleme = lu.error.issues[0];
    const champ = probleme?.path[0]?.toString() ?? "?";

    throw new PaiementConfigError(VARIABLE[champ] ?? champ, probleme?.message ?? "valeur refusée");
  }

  if (CLE_DE_PRODUCTION.test(lu.data.cleSecrete) && !lu.data.live) {
    throw new PaiementLiveNonAutoriseError();
  }

  return lu.data;
}

/**
 * Le paiement est-il configuré ?
 *
 * Ne lève pas : c'est la question que pose l'écran de l'offre pour savoir s'il
 * a le droit de proposer d'acheter. Un déploiement sans clés reste parfaitement
 * utilisable — il montre l'offre et dit que le paiement n'est pas encore
 * ouvert, ce qui est vrai, plutôt que d'exposer un bouton qui casse.
 */
export function paiementOuvert(): boolean {
  try {
    lireConfigDePaiement();

    return true;
  } catch {
    // Le silence est volontaire et n'en est pas un : le paiement fermé est un
    // état normal du produit, pas un incident. Ce qui doit crier, c'est un
    // achat tenté sans configuration — et celui-là passe par `lireConfigDePaiement`.
    return false;
  }
}

/** Dans quel monde le paiement parle, ou s'il ne parle pas. */
export type ModeDePaiement = "ferme" | "test" | "live";

/**
 * L'état du paiement, pour l'écran qui le regarde.
 *
 * **Il se lit, il ne se change pas.** `PAIEMENT_LIVE` est le dernier verrou
 * avant d'encaisser du vrai argent avec une vraie clé : le rendre pilotable
 * depuis un écran web le rendrait franchissable d'un clic distrait, pour un
 * geste qu'on ne pose qu'une fois dans la vie d'un produit. C'est la même règle
 * que celle déjà écrite pour `ADMIN_EMAILS` — la liste qui décide qui ouvre
 * l'écran d'administration ne se modifie pas depuis cet écran.
 *
 * Ce qui manquait n'était pas l'interrupteur, c'était de savoir où l'on est.
 */
export function modeDePaiement(): ModeDePaiement {
  try {
    const { cleSecrete } = lireConfigDePaiement();

    return CLE_DE_PRODUCTION.test(cleSecrete) ? "live" : "test";
  } catch {
    // Même silence volontaire que `paiementOuvert()`, et pour la même raison :
    // un paiement fermé est un état normal du produit, pas un incident.
    return "ferme";
  }
}
