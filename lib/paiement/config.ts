import { z } from "zod";
import { PaiementConfigError, PaiementLiveNonAutoriseError } from "./erreurs";

/**
 * Les secrets du paiement, lus et validés à chaque usage plutôt qu'au
 * chargement : couper le paiement chez l'hébergeur prend effet sans
 * redémarrage.
 *
 * Le mode test est le défaut : une clé de production est refusée tant que
 * `PAIEMENT_LIVE` ne vaut pas `true`, comme `MOCK_AI` pour le modèle.
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
 * Ce qui distingue une clé de production : le préfixe Stripe, seul signe
 * disponible sans appeler l'API.
 */
const CLE_DE_PRODUCTION = /^(sk|rk)_live_/;

/**
 * La configuration, ou une erreur qui nomme la variable fautive : un paiement à
 * moitié configuré n'a aucun comportement acceptable. L'écran, lui, demande
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
 * Le paiement est-il configuré ? Ne lève pas : un déploiement sans clés montre
 * l'offre et dit que le paiement n'est pas ouvert, plutôt qu'un bouton qui
 * casse.
 */
export function paiementOuvert(): boolean {
  try {
    lireConfigDePaiement();

    return true;
  } catch {
    // Le paiement fermé est un état normal, pas un incident. Un achat tenté
    // sans configuration, lui, lève par `lireConfigDePaiement`.
    return false;
  }
}

/** Dans quel monde le paiement parle, ou s'il ne parle pas. */
export type ModeDePaiement = "ferme" | "test" | "live";

/**
 * L'état du paiement, pour l'écran qui l'affiche. Il se lit, il ne se change
 * pas : `PAIEMENT_LIVE` est le dernier verrou avant d'encaisser, il ne doit pas
 * se franchir d'un clic (même règle que `ADMIN_EMAILS`).
 */
export function modeDePaiement(): ModeDePaiement {
  try {
    const { cleSecrete } = lireConfigDePaiement();

    return CLE_DE_PRODUCTION.test(cleSecrete) ? "live" : "test";
  } catch {
    // Comme dans `paiementOuvert()` : fermé est un état normal.
    return "ferme";
  }
}
