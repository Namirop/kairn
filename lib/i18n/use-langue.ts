import { useLocale } from "next-intl";
import type { Langue } from "@/lib/db/types";
import { langueDeLocale } from "./langues";

/**
 * La langue de l'écran, côté composant — client ou serveur synchrone.
 *
 * Pour ce que les messages ne portent pas : un catalogue du domaine, une
 * étiquette `Intl`. Un texte d'interface, lui, passe par `useTranslations`.
 */
export function useLangue(): Langue {
  return langueDeLocale(useLocale());
}
