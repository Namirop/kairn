import type { VariantFacet } from "@/lib/db/types";

/**
 * Ce que chaque facette demande, dit à l'utilisateur.
 *
 * Les valeurs de l'enum sont la langue du schéma ; l'écran parle celle du
 * produit. Sans cette table, ce sont `RECOGNITION` et `MECHANISM` qui
 * s'affichent sous un concept, en anglais, au-dessus d'une question française.
 *
 * Le `Record` sur l'enum est volontaire : ajouter une facette sans son libellé
 * ne compile pas.
 */
export const LIBELLE_FACETTE: Record<VariantFacet, string> = {
  RECOGNITION: "Reconnaître",
  MECHANISM: "Expliquer",
  BOUNDARY: "Délimiter",
  APPLICATION: "Appliquer",
};
