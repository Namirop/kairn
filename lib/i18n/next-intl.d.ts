import type { Messages } from "./messages";

/**
 * Les clés de traduction sont typées : `t("revision.passer")` ne compile que si
 * la clé existe, et ses paramètres sont vérifiés.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: "fr" | "en";
    Messages: Messages;
  }
}
