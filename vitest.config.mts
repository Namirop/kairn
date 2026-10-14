import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Périmètre de test : `lib/domain/`, et quelques exceptions qui échouent sans
 * bruit — toutes sans base, sans réseau ni horloge, leurs collaborateurs reçus
 * en paramètre.
 *
 * - `lib/ai/` : la dérivation du schéma d'outil décide si le modèle voit un
 *   tableau ou rien, et les garde-fous (alerte de plafond) ne doivent ni partir
 *   en rafale ni casser le dépôt qu'ils surveillent.
 * - `lib/paiement/` : l'alerte du webhook, la seule panne qui coûte de l'argent
 *   à quelqu'un d'autre ; la relance de Stripe dure trois jours.
 * - `scripts/evaluation/mesures/` : la géométrie du banc et ses seuils
 *   calibrés. Une segmentation qui dérive rend deux rapports incomparables. Le
 *   client d'embeddings et son cache restent hors périmètre.
 * - `scripts/docs/` : la carte des docs que lit `npm run docs:check`.
 *
 * Le fuseau du processus est fixé, et sur un décalage non entier : un test qui
 * dépendrait en douce du fuseau de la machine échoue partout de la même façon,
 * au lieu de passer à Paris et de casser en CI (UTC).
 */
process.env.TZ = "Asia/Kathmandu";

export default defineConfig({
  test: {
    include: [
      "lib/domain/**/*.test.ts",
      "lib/ai/*.test.ts",
      "lib/ai/schemas/**/*.test.ts",
      "lib/paiement/*.test.ts",
      "scripts/evaluation/mesures/**/*.test.ts",
      "scripts/docs/*.test.ts",
    ],
    environment: "node",
    env: { TZ: "Asia/Kathmandu" },
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
});
