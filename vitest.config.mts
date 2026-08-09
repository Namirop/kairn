import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Périmètre de test : `lib/domain/` et rien d'autre. Ces modules sont purs, ils
 * se testent sans base, sans réseau et sans rendu.
 *
 * Le fuseau et l'horloge du processus sont fixés : un test qui passerait à Paris
 * et échouerait à Auckland ne prouve rien. Les fonctions reçoivent de toute
 * façon leurs instants en paramètre — ce réglage est une ceinture de sécurité.
 */
export default defineConfig({
  test: {
    include: ["lib/domain/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
});
