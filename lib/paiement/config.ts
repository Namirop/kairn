import { z } from "zod";
import { PaiementConfigError, PaiementLiveNonAutoriseError } from "./erreurs";

/**
 * Lus à chaque usage, pas au chargement : couper le paiement chez l'hébergeur
 * prend effet sans redémarrage. Une clé de production est refusée tant que
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

/** Pour que l'erreur dise quoi corriger. */
const VARIABLE: Record<string, string> = {
  cleSecrete: "STRIPE_SECRET_KEY",
  secretDuWebhook: "STRIPE_WEBHOOK_SECRET",
  live: "PAIEMENT_LIVE",
};

/** Le préfixe, seul signe disponible sans appeler l'API. */
const CLE_DE_PRODUCTION = /^(sk|rk)_live_/;

/**
 * Lève : un paiement à moitié configuré n'a aucun comportement acceptable.
 * L'écran demande `paiementOuvert()`.
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

/** Ne lève pas : sans clés, l'offre s'affiche « pas ouverte » plutôt qu'un bouton qui casse. */
export function paiementOuvert(): boolean {
  try {
    lireConfigDePaiement();

    return true;
  } catch (erreur) {
    // Fermé est un état normal ; un achat sans configuration, lui, lève.
    signalerUneCleLiveBloquee(erreur);
    return false;
  }
}

export type ModeDePaiement = "ferme" | "test" | "live";

/**
 * Lecture seule : `PAIEMENT_LIVE` est le dernier verrou avant d'encaisser, il
 * ne se franchit pas d'un clic (comme `ADMIN_EMAILS`).
 */
export function modeDePaiement(): ModeDePaiement {
  try {
    const { cleSecrete } = lireConfigDePaiement();

    return CLE_DE_PRODUCTION.test(cleSecrete) ? "live" : "test";
  } catch (erreur) {
    // Comme dans `paiementOuvert()` : fermé est un état normal.
    signalerUneCleLiveBloquee(erreur);
    return "ferme";
  }
}

/**
 * Ce cas ferme le paiement comme voulu, mais c'est une erreur de configuration :
 * journalisée, sinon l'écran dit « fermé » sans explication.
 */
function signalerUneCleLiveBloquee(erreur: unknown): void {
  if (erreur instanceof PaiementLiveNonAutoriseError) {
    console.error("[paiement] clé de production posée sans PAIEMENT_LIVE=true : paiement fermé");
  }
}
