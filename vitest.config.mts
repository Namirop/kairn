import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Périmètre de test : `lib/domain/`, plus les schémas de `lib/ai/`. Ces modules
 * sont purs, ils se testent sans base, sans réseau et sans rendu.
 *
 * L'exception des schémas est arrivée après le premier passage du banc : la
 * dérivation du schéma d'outil est ce qui décide si le modèle voit un tableau
 * ou rien, et une dérivation muette ne se remarque qu'à la facture.
 *
 * Le fuseau et l'horloge du processus sont fixés : un test qui passerait à Paris
 * et échouerait à Auckland ne prouve rien. Les fonctions reçoivent de toute
 * façon leurs instants en paramètre — ce réglage est une ceinture de sécurité.
 */
export default defineConfig({
  test: {
    include: ["lib/domain/**/*.test.ts", "lib/ai/schemas/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
});
