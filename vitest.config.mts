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
 * La seconde exception suit la même logique. Les garde-fous de `lib/ai/` ont ceci
 * de commun qu'ils échouent **sans bruit** : une alerte de plafond qui part
 * quinze fois arrive dans une boîte mail que personne ne regarde, et une alerte
 * qui casse le dépôt qu'elle surveille ressemble à une panne d'extraction. Les
 * fichiers concernés reçoivent leurs collaborateurs en paramètre, précisément
 * pour rester vérifiables ici : le périmètre s'élargit, la règle ne bouge pas —
 * ni base, ni réseau, ni horloge.
 *
 * La troisième est l'alerte du paiement, `lib/paiement/`. Elle relève exactement
 * du même cas que celles de `lib/ai/`, à un détail près qui la rend plus
 * coûteuse encore : ce qu'elle surveille est la seule panne du produit qui coûte
 * de l'argent à quelqu'un d'autre. Une alerte qui part soixante-douze fois — la
 * relance de Stripe dure trois jours — se perd dans une boîte qu'on cesse de
 * lire ; une alerte qui casse le webhook qu'elle surveille transforme une panne
 * rattrapable en panne définitive. Mêmes conditions d'admission : collaborateurs
 * reçus en paramètre, ni base, ni réseau, ni horloge.
 *
 * La quatrième est la géométrie du banc, `scripts/evaluation/mesures/`.
 * Elle échoue elle aussi sans bruit, et d'une façon particulièrement coûteuse :
 * une segmentation qui dérive d'un passage à l'autre fait apparaître des manques
 * qui n'existent pas, et deux rapports cessent de se comparer sans que rien ne
 * le signale. Ces modules sont purs — du texte et des nombres, aucun appel — et
 * ce sont eux qui portent les seuils calibrés à la main. Le client d'embeddings
 * et son cache, qui touchent au réseau et au disque, restent hors périmètre.
 *
 * Le fuseau et l'horloge du processus sont fixés : un test qui passerait à Paris
 * et échouerait à Auckland ne prouve rien. Les fonctions reçoivent de toute
 * façon leurs instants en paramètre — ce réglage est une ceinture de sécurité.
 */
export default defineConfig({
  test: {
    include: [
      "lib/domain/**/*.test.ts",
      "lib/ai/*.test.ts",
      "lib/ai/schemas/**/*.test.ts",
      "lib/paiement/*.test.ts",
      "scripts/evaluation/mesures/**/*.test.ts",
    ],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
});
