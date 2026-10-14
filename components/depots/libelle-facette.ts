import type { VariantFacet } from "@/lib/db/types";
import { facettes } from "@/lib/i18n/messages/fr/depots/concept";

/**
 * Ce que chaque facette demande, dit à l'utilisateur. Le `Record` sur l'enum
 * fait qu'une facette sans libellé ne compile pas. Un écran les dit dans sa
 * langue avec `useTranslations("depots.facettes")`.
 *
 * @deprecated En français seulement — aucun écran ne le lit aujourd'hui.
 */
export const LIBELLE_FACETTE: Record<VariantFacet, string> = facettes;
