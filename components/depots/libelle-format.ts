import type { VariantFormat } from "@/lib/db/types";
import { formats } from "@/lib/i18n/messages/fr/depots/concept";

/**
 * Sous quelle forme une question est posée, dit à l'utilisateur.
 *
 * Le pendant de `libelle-facette.ts` : les valeurs de l'enum sont la langue du
 * schéma, l'écran parle celle du produit. Sans cette table, ce sont `CLOZE` et
 * `TRUE_FALSE` qui s'affichent au-dessus d'une question française.
 *
 * **La facette ne se montre nulle part, le format si.** L'écran de révision ne
 * dit ni l'un ni l'autre — savoir qu'on est interrogé sur du rappel ne change
 * rien à l'effort de rappel. La landing, elle, ne fait pas réviser : elle
 * démontre, et ce qu'elle a à démontrer est précisément qu'un même concept se
 * repose sous plusieurs formes. Le nom du format y est donc l'information, pas
 * une étiquette de système posée devant un exercice.
 *
 * Le `Record` sur l'enum est volontaire : ajouter un format sans son libellé ne
 * compile pas.
 *
 * Les libellés vivent dans `depots.formats`, une clé par valeur de l'enum : un
 * écran les dit dans sa langue avec `useTranslations("depots.formats")`.
 *
 * @deprecated En français seulement, gardé pour la vitrine de la landing tant
 * qu'elle le lit. Tiré des mêmes messages : rien n'est écrit deux fois.
 */
export const LIBELLE_FORMAT: Record<VariantFormat, string> = formats;
