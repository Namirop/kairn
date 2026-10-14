import type { VariantFormat } from "@/lib/db/types";
import { formats } from "@/lib/i18n/messages/fr/depots/concept";

/**
 * Le nom des formats de question, en français. Le `Record` sur l'enum fait
 * qu'un format sans libellé ne compile pas.
 *
 * @deprecated Plus importé nulle part : les écrans lisent `depots.formats` avec
 * `useTranslations`. Tiré des mêmes messages, rien n'est écrit deux fois.
 */
export const LIBELLE_FORMAT: Record<VariantFormat, string> = formats;
