import { useLocale } from "next-intl";
import type { Langue } from "@/lib/db/types";
import { langueDeLocale } from "./langues";

/**
 * Pour ce que les messages ne portent pas (catalogue du domaine, étiquette
 * `Intl`) ; un texte d'interface passe par `useTranslations`.
 */
export function useLangue(): Langue {
  return langueDeLocale(useLocale());
}
