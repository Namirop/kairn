import type { VariantFacet } from "@/lib/db/types";
import { facettes } from "@/lib/i18n/messages/fr/depots/concept";

/**
 * Ce que chaque facette demande, dit à l'utilisateur.
 *
 * Les valeurs de l'enum sont la langue du schéma ; l'écran parle celle du
 * produit. Sans cette table, ce sont `RECOGNITION` et `MECHANISM` qui
 * s'affichent sous un concept, en anglais, au-dessus d'une question française.
 *
 * Le `Record` sur l'enum est volontaire : ajouter une facette sans son libellé
 * ne compile pas.
 *
 * Les libellés vivent dans `depots.facettes`, une clé par valeur de l'enum : un
 * écran les dit dans sa langue avec `useTranslations("depots.facettes")`.
 *
 * @deprecated En français seulement — aucun écran ne le lit aujourd'hui.
 */
export const LIBELLE_FACETTE: Record<VariantFacet, string> = facettes;
